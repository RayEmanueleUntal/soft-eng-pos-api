import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreatePurchaseOrderDto,
  GetPurchaseOrdersQueryDto,
  PaginatedPurchaseOrdersResponseDto,
  PurchaseOrderResponseDto,
  UpdatePOStatusDto,
} from './dto';
import {
  InactiveSupplierException,
  ProductsNotFoundException,
  PurchaseOrderHasDeliveriesException,
  PurchaseOrderImmutableException,
  PurchaseOrderNotFoundException,
  SupplierNotFoundException,
} from 'src/common/exceptions';
import { POStatus } from 'src/generated/prisma/enums';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class PurchaseOrdersService {
  private readonly logger = new Logger(PurchaseOrdersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new Purchase Order along with its associated line items inside an atomic database transaction.
   * Leverages in-memory consolidation to satisfy the @@unique([poId, productId]) constraint seamlessly.
   */
  async createPurchaseOrder(
    dto: CreatePurchaseOrderDto,
    staffId: number,
  ): Promise<PurchaseOrderResponseDto> {
    this.logger.log(
      `Initiating Purchase Order creation: supplierId=${dto.supplierId}, staffId=${staffId}, itemCount=${dto.items.length}`,
    );

    // 1. Verify Supplier existence and active status
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: dto.supplierId },
      select: { id: true, name: true, is_active: true },
    });

    if (!supplier) {
      this.logger.warn(
        `Purchase Order creation failed: Supplier ID ${dto.supplierId} not found.`,
      );
      throw new SupplierNotFoundException(dto.supplierId);
    }

    if (!supplier.is_active) {
      this.logger.warn(
        `Purchase Order creation failed: Supplier ID ${dto.supplierId} (${supplier.name}) is inactive.`,
      );
      throw new InactiveSupplierException(supplier.name, dto.supplierId);
    }

    // 2. Consolidate duplicate products in the request payload to satisfy @@unique([poId, productId]) constraint
    const consolidatedItemsMap = new Map<
      number,
      { productId: number; requested_quantity: number; unit_cost?: number }
    >();

    for (const item of dto.items) {
      const existing = consolidatedItemsMap.get(item.productId);
      if (existing) {
        existing.requested_quantity += item.requested_quantity;
        if (item.unit_cost !== undefined) {
          existing.unit_cost = item.unit_cost; // Overwrite with explicit pricing if specified
        }
      } else {
        consolidatedItemsMap.set(item.productId, { ...item });
      }
    }

    const consolidatedItems = Array.from(consolidatedItemsMap.values());
    const productIds = consolidatedItems.map((item) => item.productId);

    // 3. Verify all requested products exist in database
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        cost_price: true,
        reorder_point_ROP: true,
        current_quantity: true,
      },
    });

    if (products.length !== productIds.length) {
      const foundIds = new Set(products.map((p) => p.id));
      const missingIds = productIds.filter((id) => !foundIds.has(id));

      this.logger.warn(
        `Purchase Order creation failed: Missing product IDs [${missingIds.join(', ')}]`,
      );
      throw new ProductsNotFoundException(missingIds);
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // 4. Construct PO items payload, falling back to product.cost_price if unit_cost is unassigned
    const poItemsCreatePayload = consolidatedItems.map((item) => {
      const product = productMap.get(item.productId)!;
      const finalUnitCost = item.unit_cost ?? Number(product.cost_price);

      // Informational log for products ordered outside/above ROP (Non-blocking)
      if (
        Number(product.current_quantity) > Number(product.reorder_point_ROP)
      ) {
        this.logger.log(
          `Product ID ${product.id} (${product.name}) is above ROP (Qty: ${product.current_quantity}, ROP: ${product.reorder_point_ROP}). Including in PO per user request.`,
        );
      }

      return {
        productId: item.productId,
        requested_quantity: item.requested_quantity,
        unit_cost: finalUnitCost,
      };
    });

    // 5. Execute atomic transaction to save PurchaseOrder and POItems
    try {
      const createdPO = await this.prisma.$transaction(async (tx) => {
        return tx.purchaseOrder.create({
          data: {
            supplierId: dto.supplierId,
            staffId: staffId,
            po_status: POStatus.PENDING,
            poItems: {
              create: poItemsCreatePayload,
            },
          },
          include: {
            supplier: { select: { id: true, name: true } },
            staff: { select: { id: true, first_name: true, last_name: true } },
            poItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                    base_uom: true,
                  },
                },
              },
            },
          },
        });
      });

      this.logger.log(
        `Successfully created Purchase Order ID: ${createdPO.id} for Supplier: ${supplier.name} with ${createdPO.poItems.length} items.`,
      );

      return PurchaseOrderResponseDto.fromEntity(createdPO);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to execute Purchase Order transaction: ${message}`,
        stack,
      );

      throw new InternalServerErrorException(
        'An unexpected error occurred while creating the Purchase Order.',
      );
    }
  }

  /**
   * Retrieves a single Purchase Order by its ID.
   */
  async getPurchaseOrderById(id: number): Promise<PurchaseOrderResponseDto> {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true } },
        staff: { select: { id: true, first_name: true, last_name: true } },
        poItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                base_uom: true,
              },
            },
          },
        },
      },
    });

    if (!po) {
      throw new PurchaseOrderNotFoundException(id);
    }

    return PurchaseOrderResponseDto.fromEntity(po);
  }

  /**
   * Retrieves a paginated list of Purchase Orders with optional status, supplier, and date filtering.
   */
  async getAllPurchaseOrders(
    query: GetPurchaseOrdersQueryDto,
  ): Promise<PaginatedPurchaseOrdersResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    // Build dynamic Prisma filter condition
    const where: Prisma.PurchaseOrderWhereInput = {};

    if (query.status) {
      where.po_status = query.status;
    }

    if (query.supplierId) {
      where.supplierId = query.supplierId;
    }

    if (query.startDate || query.endDate) {
      where.order_date = {};
      if (query.startDate) {
        where.order_date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.order_date.lte = new Date(query.endDate);
      }
    }

    this.logger.log(
      `Fetching paginated purchase orders: page=${page}, limit=${limit}, filters=${JSON.stringify(where)}`,
    );

    const [total, orders] = await Promise.all([
      this.prisma.purchaseOrder.count({ where }),
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { order_date: 'desc' },
        include: {
          supplier: { select: { id: true, name: true } },
          staff: { select: { id: true, first_name: true, last_name: true } },
          poItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  base_uom: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const formattedOrders = orders.map((order) =>
      PurchaseOrderResponseDto.fromEntity(order),
    );

    return PaginatedPurchaseOrdersResponseDto.fromEntity(
      formattedOrders,
      total,
      page,
      limit,
    );
  }

  /**
   * Updates the status of an existing Purchase Order (e.g., cancelling a pending order).
   * Enforces immutability: orders that are already FULFILLED or CANCELLED cannot be updated.
   */
  async updatePurchaseOrderStatus(
    id: number,
    dto: UpdatePOStatusDto,
  ): Promise<PurchaseOrderResponseDto> {
    this.logger.log(
      `Attempting status update for Purchase Order ID ${id} to ${dto.po_status}`,
    );

    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { deliveries: { select: { id: true } } },
    });

    if (!po) {
      throw new PurchaseOrderNotFoundException(id);
    }

    // Protect against modifying terminal states
    if (
      po.po_status === POStatus.FULFILLED ||
      po.po_status === POStatus.CANCELLED
    ) {
      this.logger.warn(
        `Failed to update Purchase Order ID ${id}: Status is terminal (${po.po_status})`,
      );
      throw new PurchaseOrderImmutableException(id, po.po_status);
    }

    // Prevent cancellation if deliveries have already been received
    if (po.deliveries.length > 0 && dto.po_status === POStatus.CANCELLED) {
      this.logger.warn(
        `Failed to cancel Purchase Order ID ${id}: Existing deliveries linked (${po.deliveries.length})`,
      );
      throw new PurchaseOrderHasDeliveriesException(id, po.deliveries.length);
    }

    const updatedPO = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { po_status: dto.po_status },
      include: {
        supplier: { select: { id: true, name: true } },
        staff: { select: { id: true, first_name: true, last_name: true } },
        poItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                base_uom: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(
      `Successfully updated Purchase Order ID ${id} status from ${po.po_status} to ${updatedPO.po_status}`,
    );

    return PurchaseOrderResponseDto.fromEntity(updatedPO);
  }
}
