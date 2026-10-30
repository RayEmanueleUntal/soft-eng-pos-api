import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { InventoryService } from 'src/inventory/inventory.service';
import {
  CreateDeliveryDto,
  DeliveryResponseDto,
  GetDeliveriesQueryDto,
  PaginatedDeliveriesResponseDto,
} from './dto';
import {
  InvalidPOStatusException,
  POItemNotFoundException,
  PurchaseOrderNotFoundException,
  ProductsNotFoundException,
  InvalidDeliveryQuantityException,
} from 'src/common/exceptions';
import { Prisma } from 'src/generated/prisma/client';
import { POStatus } from 'src/generated/prisma/enums';

@Injectable()
export class DeliveriesService {
  private readonly logger = new Logger(DeliveriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Verifies and logs physical delivery receiving against a Purchase Order.
   * Calculates Weighted Average Costing (WAC) per item, updates Product cost_price,
   * invokes InventoryService.restockProductStock() for inventory & movement auditing,
   * and updates PO status atomically.
   */
  async processDelivery(
    staffId: number,
    dto: CreateDeliveryDto,
  ): Promise<{
    delivery: DeliveryResponseDto;
    isPartial: boolean;
    message: string;
  }> {
    this.logger.log(
      `Processing delivery for PO #${dto.poId} by Staff #${staffId}`,
    );

    // 1. Fetch Purchase Order and its items along with past deliveries
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: dto.poId },
      include: {
        poItems: true,
        deliveries: {
          include: { deliveryItems: true },
        },
      },
    });

    if (!po) {
      this.logger.warn(
        `Delivery verification failed: PO #${dto.poId} not found.`,
      );
      throw new PurchaseOrderNotFoundException(dto.poId);
    }

    if (
      po.po_status !== POStatus.PENDING &&
      po.po_status !== POStatus.PARTIALLY_FULFILLED
    ) {
      this.logger.warn(
        `Delivery rejected: PO #${dto.poId} has status ${po.po_status}`,
      );
      throw new InvalidPOStatusException(po.id, po.po_status);
    }

    // Map existing received base quantities per product across previous deliveries
    const totalReceivedBaseQtyMap = new Map<number, number>();
    for (const pastDelivery of po.deliveries) {
      for (const item of pastDelivery.deliveryItems) {
        const current = totalReceivedBaseQtyMap.get(item.productId) || 0;
        totalReceivedBaseQtyMap.set(
          item.productId,
          current + Number(item.actual_base_quantity),
        );
      }
    }

    // Index PO Items by productId for fast lookup and cost calculation
    const poItemsMap = new Map<number, (typeof po.poItems)[0]>();
    po.poItems.forEach((item) => {
      poItemsMap.set(item.productId, item);
    });

    // Validate submitted items against PO items & consolidate input details
    type ProcessedDeliveryInput = {
      productId: number;
      receivedQuantity: number;
      receivedUom: any;
      conversionFactor: number;
      actualBaseQuantity: number;
      poItem: (typeof po.poItems)[0];
    };

    const processedItems: ProcessedDeliveryInput[] = [];

    for (const item of dto.items) {
      const poItem = poItemsMap.get(item.productId);
      if (!poItem) {
        this.logger.warn(
          `Delivery item error: Product #${item.productId} not in PO #${po.id}`,
        );
        throw new POItemNotFoundException(po.id, item.productId);
      }

      const receivedQty = Number(item.received_quantity);
      if (receivedQty <= 0) {
        throw new InvalidDeliveryQuantityException(
          item.productId,
          'Received quantity must be greater than zero.',
        );
      }

      const conversionFactor = item.uom_conversion_factor
        ? Number(item.uom_conversion_factor)
        : Number(poItem.uom_conversion_factor);

      if (conversionFactor <= 0) {
        throw new InvalidDeliveryQuantityException(
          item.productId,
          'Conversion factor must be greater than zero.',
        );
      }

      // Calculate or use explicitly provided actual base quantity override
      const actualBaseQuantity = item.actual_base_quantity
        ? Number(item.actual_base_quantity)
        : receivedQty * conversionFactor;

      if (actualBaseQuantity <= 0) {
        throw new InvalidDeliveryQuantityException(
          item.productId,
          'Actual base quantity must be greater than zero.',
        );
      }

      processedItems.push({
        productId: item.productId,
        receivedQuantity: receivedQty,
        receivedUom: item.received_uom || poItem.ordered_uom,
        conversionFactor,
        actualBaseQuantity,
        poItem,
      });
    }

    // 2. Batch verify existence of all submitted products in the database
    const submittedProductIds = processedItems.map((i) => i.productId);
    const existingProducts = await this.prisma.product.findMany({
      where: { id: { in: submittedProductIds } },
      select: {
        id: true,
        current_quantity: true,
        cost_price: true,
        base_uom: true,
      },
    });

    if (existingProducts.length !== submittedProductIds.length) {
      const existingIds = new Set(existingProducts.map((p) => p.id));
      const missingProductIds = submittedProductIds.filter(
        (id) => !existingIds.has(id),
      );

      this.logger.warn(
        `Delivery verification failed: Missing product IDs [${missingProductIds.join(', ')}]`,
      );
      throw new ProductsNotFoundException(missingProductIds);
    }

    const productMap = new Map(existingProducts.map((p) => [p.id, p]));

    // 3. Execute Transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create Delivery record and DeliveryItems with snapshot metrics
      const delivery = await tx.delivery.create({
        data: {
          poId: po.id,
          staffId,
          deliveryItems: {
            create: processedItems.map((item) => ({
              productId: item.productId,
              received_quantity: item.receivedQuantity,
              received_uom: item.receivedUom,
              uom_conversion_factor: item.conversionFactor,
              actual_base_quantity: item.actualBaseQuantity,
            })),
          },
        },
        include: {
          staff: { select: { id: true, first_name: true, last_name: true } },
          deliveryItems: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
      });

      // Recalculate WAC, update product cost_price, and restock inventory via InventoryService
      for (const item of processedItems) {
        const product = productMap.get(item.productId)!;

        const currentQty = Number(product.current_quantity);
        const currentCost = Number(product.cost_price);
        const receivedBaseQty = item.actualBaseQuantity;

        // Calculate unit cost per base UOM from PO Item pricing
        const poUnitCost = Number(item.poItem.unit_cost);
        const poConversionFactor = Number(item.poItem.uom_conversion_factor);
        const intakeBaseCost =
          poConversionFactor > 0 ? poUnitCost / poConversionFactor : poUnitCost;

        // Weighted Average Costing (WAC) formula:
        // New Cost = ((Current Qty * Current Cost) + (Received Base Qty * Intake Base Cost)) / (Current Qty + Received Base Qty)
        const totalNewQty = currentQty + receivedBaseQty;
        let newWeightedCost = intakeBaseCost;

        if (currentQty > 0 && totalNewQty > 0) {
          newWeightedCost =
            (currentQty * currentCost + receivedBaseQty * intakeBaseCost) /
            totalNewQty;
        }

        const roundedNewCost = new Prisma.Decimal(
          Math.max(0, newWeightedCost).toFixed(2),
        );

        // Step A: Update Product cost_price before restocking stock
        await tx.product.update({
          where: { id: item.productId },
          data: { cost_price: roundedNewCost },
        });

        this.logger.log(
          `Updated Product #${product.id} WAC: ${currentCost} -> ${roundedNewCost.toString()} (Intake Base Cost: ${intakeBaseCost})`,
        );

        // Step B: Delegate stock restock and movement recording to InventoryService
        await this.inventoryService.restockProductStock(tx, {
          productId: item.productId,
          quantityToAdd: item.actualBaseQuantity,
          provided_uom: product.base_uom, // Passing computed canonical base quantity directly
          userId: staffId,
          reason: `PO #${po.id} Delivery Receiving (Delivery #${delivery.id})`,
          operation_name: 'DELIVERY_RECEIVING',
        });
      }

      // Track multi-item intake in case duplicate entries exist in delivery payload
      const newlyAddedBaseQtyMap = new Map<number, number>();
      for (const item of processedItems) {
        const current = newlyAddedBaseQtyMap.get(item.productId) || 0;
        newlyAddedBaseQtyMap.set(
          item.productId,
          current + item.actualBaseQuantity,
        );
      }

      // Determine PO status based on expected base quantities
      let isFullyFulfilled = true;
      for (const poItem of po.poItems) {
        const pastBaseQty = totalReceivedBaseQtyMap.get(poItem.productId) || 0;
        const newlyAddedBaseQty =
          newlyAddedBaseQtyMap.get(poItem.productId) || 0;
        const totalBaseReceived = pastBaseQty + newlyAddedBaseQty;

        const expectedBaseQty = Number(poItem.expected_base_quantity);

        if (totalBaseReceived < expectedBaseQty) {
          isFullyFulfilled = false;
          break;
        }
      }

      const newPoStatus = isFullyFulfilled
        ? POStatus.FULFILLED
        : POStatus.PARTIALLY_FULFILLED;

      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { po_status: newPoStatus },
      });

      return {
        delivery,
        isPartial: !isFullyFulfilled,
      };
    });

    this.logger.log(
      `Delivery #${result.delivery.id} processed successfully for PO #${po.id}. New PO Status: ${
        result.isPartial ? 'PARTIALLY_FULFILLED' : 'FULFILLED'
      }`,
    );

    const message = result.isPartial
      ? 'Quantities received do not match PO expected base quantities. PO marked as Partially Fulfilled.'
      : 'Success: Delivery verified, WAC calculated, and inventory stock levels updated.';

    return {
      delivery: DeliveryResponseDto.fromEntity(result.delivery),
      isPartial: result.isPartial,
      message,
    };
  }

  /**
   * Retrieves paginated deliveries with query filters.
   */
  async findAll(
    query: GetDeliveriesQueryDto,
  ): Promise<PaginatedDeliveriesResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.poId) where.poId = query.poId;
    if (query.startDate || query.endDate) {
      where.delivery_date = {};
      if (query.startDate) where.delivery_date.gte = new Date(query.startDate);
      if (query.endDate) where.delivery_date.lte = new Date(query.endDate);
    }

    this.logger.log(
      `Fetching paginated deliveries: page=${page}, limit=${limit}, filters=${JSON.stringify(where)}`,
    );

    const [deliveries, total] = await Promise.all([
      this.prisma.delivery.findMany({
        where,
        skip,
        take: limit,
        orderBy: { delivery_date: 'desc' },
        include: {
          staff: { select: { id: true, first_name: true, last_name: true } },
          deliveryItems: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
      }),
      this.prisma.delivery.count({ where }),
    ]);

    const formattedDeliveries = deliveries.map(DeliveryResponseDto.fromEntity);

    return PaginatedDeliveriesResponseDto.fromEntity(
      formattedDeliveries,
      total,
      page,
      limit,
    );
  }

  /**
   * Retrieves a single delivery by ID.
   */
  async findOne(id: number): Promise<DeliveryResponseDto> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        staff: { select: { id: true, first_name: true, last_name: true } },
        deliveryItems: {
          include: { product: { select: { id: true, name: true, sku: true } } },
        },
      },
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery record #${id} not found.`);
    }

    return DeliveryResponseDto.fromEntity(delivery);
  }
}
