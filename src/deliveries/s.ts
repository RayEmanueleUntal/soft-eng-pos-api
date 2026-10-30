import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
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
} from 'src/common/exceptions';
import { MovementType, POStatus } from 'src/generated/prisma/client';

@Injectable()
export class DeliveriesService {
  private readonly logger = new Logger(DeliveriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifies and logs physical delivery receiving against a Purchase Order.
   * Performs inventory stock-in, logs StockMovement records, and updates PO status atomically.
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

    // Map existing received quantities per product across previous deliveries
    const totalReceivedMap = new Map<number, number>();
    for (const pastDelivery of po.deliveries) {
      for (const item of pastDelivery.deliveryItems) {
        const current = totalReceivedMap.get(item.productId) || 0;
        totalReceivedMap.set(
          item.productId,
          current + Number(item.received_quantity),
        );
      }
    }

    // Validate submitted items against PO items
    const poItemsMap = new Map<number, number>();
    po.poItems.forEach((item) => {
      poItemsMap.set(item.productId, Number(item.requested_quantity));
    });

    // Consolidate payload duplicate product entries
    const newItemsMap = new Map<number, number>();
    for (const item of dto.items) {
      if (!poItemsMap.has(item.productId)) {
        this.logger.warn(
          `Delivery item error: Product #${item.productId} not in PO #${po.id}`,
        );
        throw new POItemNotFoundException(po.id, item.productId);
      }
      const existing = newItemsMap.get(item.productId) || 0;
      newItemsMap.set(item.productId, existing + item.received_quantity);
    }

    // 2. Batch verify existence of all submitted products in the database
    const submittedProductIds = Array.from(newItemsMap.keys());
    const existingProducts = await this.prisma.product.findMany({
      where: { id: { in: submittedProductIds } },
      select: { id: true, current_quantity: true, base_uom: true },
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
      // Create Delivery record
      const delivery = await tx.delivery.create({
        data: {
          poId: po.id,
          staffId,
          deliveryItems: {
            create: Array.from(newItemsMap.entries()).map(
              ([productId, received_quantity]) => ({
                productId,
                received_quantity,
              }),
            ),
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

      // Stock-in each received product and generate StockMovement
      for (const [productId, qtyReceived] of newItemsMap.entries()) {
        const product = productMap.get(productId)!;

        const prevQty = Number(product.current_quantity);
        const newQty = prevQty + qtyReceived;

        // Update product inventory
        await tx.product.update({
          where: { id: productId },
          data: { current_quantity: newQty },
        });

        // Create audit StockMovement record
        await tx.stockMovement.create({
          data: {
            productId,
            staffId,
            type: MovementType.IN,
            current_uom: product.base_uom,
            quantity_changed: qtyReceived,
            previous_quantity: prevQty,
            new_quantity: newQty,
            reason: `PO #${po.id} Delivery Receiving (Delivery #${delivery.id})`,
          },
        });
      }

      // Check if PO is fully fulfilled or partially fulfilled
      let isFullyFulfilled = true;
      for (const poItem of po.poItems) {
        const pastQty = totalReceivedMap.get(poItem.productId) || 0;
        const newlyAdded = newItemsMap.get(poItem.productId) || 0;
        const totalReceived = pastQty + newlyAdded;

        if (totalReceived < Number(poItem.requested_quantity)) {
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
      ? 'Quantities received do not match PO. PO marked as Partially Fulfilled.'
      : 'Success: Delivery verified and inventory stock levels updated.';

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
