import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AdjustInventoryDto,
  AssignBinDto,
  AssignBinResponseDto,
  GetStockMovementsDto,
  LowStockAlertsResponseDto,
  PaginatedStockMovementsResponseDto,
  StockOutDto,
} from './dto';
import { Prisma } from 'src/generated/prisma/client';
import { MovementType, UnitOfMeasure } from 'src/generated/prisma/enums';
import { UOMMismatchException } from 'src/common/exceptions';
import { StockInDto } from './dto/requests/stock-in.dto';
import { TransactionClient } from 'src/generated/prisma/internal/prismaNamespace';
import { Product, ProductUom } from 'src/generated/prisma/client';
import { StockMovementResponseDto } from './dto/responses/stock-movement-response.dto';
import { InsufficientStockException } from 'src/common/exceptions';

// Extended Product type including configured uoms relation
type ProductWithUoms = Product & { uoms: ProductUom[] };

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper method: Validates existence and UOM inside a transaction context.
   * Includes configured uoms to verify providedUom against product.base_uom or configured product.uoms.
   */
  private async validateAndGetProduct(
    tx: TransactionClient,
    productId: number,
    providedUom: UnitOfMeasure,
    userId: number,
    operationName: string,
  ): Promise<{ product: ProductWithUoms; conversionFactor: Prisma.Decimal }> {
    const product = await tx.product.findUnique({
      where: { id: productId },
      include: { uoms: true },
    });

    // Check if product exists
    if (!product) {
      this.logger.warn(`${operationName} failed: Product not found`, {
        userId,
        productId,
      });

      throw new NotFoundException('Product not found');
    }

    // Determine conversion factor and validate provided UOM
    if (product.base_uom === providedUom) {
      return { product, conversionFactor: new Prisma.Decimal(1) };
    }

    const matchingUom = product.uoms.find((u) => u.uom === providedUom);
    if (matchingUom) {
      return {
        product,
        conversionFactor: new Prisma.Decimal(matchingUom.conversion_factor),
      };
    }

    const validUoms = [product.base_uom, ...product.uoms.map((u) => u.uom)];

    this.logger.warn(`${operationName} failed: UOM mismatch`, {
      userId,
      productId: product.id,
      expectedBaseUom: product.base_uom,
      providedUom,
      validUoms,
    });

    throw new UOMMismatchException(product.name, providedUom, validUoms);
  }

  /*
  Adjust Inventory
  */
  async adjustInventory(
    userId: number,
    adjustDto: AdjustInventoryDto,
  ): Promise<StockMovementResponseDto> {
    this.logger.log('Initiating inventory adjustment transaction', {
      userId,
      productId: adjustDto.productId,
    });

    const movement = await this.prisma.$transaction(async (tx) => {
      const { product, conversionFactor } = await this.validateAndGetProduct(
        tx,
        adjustDto.productId,
        adjustDto.current_uom,
        userId,
        'Inventory adjustment',
      );

      const previousQty = new Prisma.Decimal(product.current_quantity);
      // Convert new count into base UOM units
      const newBaseQty = new Prisma.Decimal(adjustDto.new_count).times(
        conversionFactor,
      );
      const qtyChanged = newBaseQty.minus(previousQty);

      const createdMovement = await tx.stockMovement.create({
        data: {
          productId: product.id,
          staffId: userId,
          date: adjustDto.date ?? new Date(),
          type: MovementType.ADJUSTMENT,
          current_uom: adjustDto.current_uom,
          quantity_changed: qtyChanged,
          previous_quantity: previousQty,
          new_quantity: newBaseQty,
          reason: adjustDto.reason,
        },
      });

      await tx.product.update({
        where: { id: product.id },
        data: {
          current_quantity: newBaseQty,
          needsRecount: false,
        },
      });

      this.logger.log('Inventory adjusted successfully', {
        movementId: createdMovement.id,
        productId: product.id,
        userId,
        previousQty: previousQty.toString(),
        newQty: newBaseQty.toString(),
        qtyChanged: qtyChanged.toString(),
      });

      return createdMovement;
    });

    return StockMovementResponseDto.fromEntity(movement);
  }

  /**
   * Helper function that increases product stock inside an active database transaction.
   * Serves as the single source of truth for all stock-in / restock operations.
   */
  async restockProductStock(
    tx: Prisma.TransactionClient,
    params: {
      productId: number;
      quantityToAdd: number | Prisma.Decimal;
      provided_uom: UnitOfMeasure;
      userId: number;
      reason: string;
      date?: Date;
      operation_name?: string;
    },
  ) {
    const {
      productId,
      quantityToAdd,
      provided_uom,
      userId,
      reason,
      date,
      operation_name = 'RESTOCK',
    } = params;

    // 1. Validate UOM and fetch product
    const { product, conversionFactor } = await this.validateAndGetProduct(
      tx,
      productId,
      provided_uom,
      userId,
      operation_name,
    );

    const prevQty = new Prisma.Decimal(product.current_quantity);
    // Convert added quantity to base UOM
    const addedBaseQty = new Prisma.Decimal(quantityToAdd).times(
      conversionFactor,
    );
    const newQty = prevQty.plus(addedBaseQty);

    // 2. Update stock level
    await tx.product.update({
      where: { id: product.id },
      data: { current_quantity: newQty },
    });

    // 3. Log Movement with provided UOM and canonical base quantity change
    const movement = await tx.stockMovement.create({
      data: {
        productId: product.id,
        staffId: userId,
        date: date ?? new Date(),
        type: MovementType.IN,
        current_uom: provided_uom,
        quantity_changed: addedBaseQty,
        previous_quantity: prevQty,
        new_quantity: newQty,
        reason,
      },
    });

    this.logger.log(`Stock restocked successfully`, {
      movementId: movement.id,
      productId: product.id,
      addedBaseQty: addedBaseQty.toString(),
      newQty: newQty.toString(),
      operation: operation_name,
    });

    return movement;
  }

  /*
  Stock-In
  */
  async stockIn(
    userId: number,
    stockInDto: StockInDto,
  ): Promise<StockMovementResponseDto> {
    this.logger.log('Initiating inventory stock-in transaction', {
      userId,
      productId: stockInDto.productId,
    });

    const movement = await this.prisma.$transaction(async (tx) => {
      return await this.restockProductStock(tx, {
        productId: stockInDto.productId,
        quantityToAdd: stockInDto.added_qty,
        provided_uom: stockInDto.current_uom,
        userId,
        reason: stockInDto.reason ?? 'Stock-In',
        date: stockInDto.date, // Pass custom date if provided in DTO
        operation_name: 'STOCK_IN',
      });
    });

    return StockMovementResponseDto.fromEntity(movement);
  }

  /*
  Helper function that reduces product stock
  */
  async reduceProductStock(
    tx: Prisma.TransactionClient,
    params: {
      productId: number;
      quantityToDeduct: number;
      provided_uom: UnitOfMeasure;
      userId: number;
      reason: string;
      allowOverride: boolean;
      operation_name: string;
    },
  ) {
    const {
      productId,
      quantityToDeduct,
      provided_uom,
      userId,
      reason,
      allowOverride,
      operation_name,
    } = params;

    const { product, conversionFactor } = await this.validateAndGetProduct(
      tx,
      productId,
      provided_uom,
      userId,
      operation_name,
    );

    const prevQty = new Prisma.Decimal(product.current_quantity);
    // Convert deducted quantity to canonical base UOM
    const baseQtyDeducted = new Prisma.Decimal(quantityToDeduct).times(
      conversionFactor,
    );
    const newQty = prevQty.minus(baseQtyDeducted);

    if (newQty.isNegative()) {
      if (!allowOverride) {
        await tx.product.update({
          where: { id: productId },
          data: { needsRecount: true },
        });

        this.logger.warn(`Checkout failed: Insufficient stock`, {
          productId: product.id,
          productName: product.name,
          requestedBase: baseQtyDeducted.toNumber(),
          availableBase: prevQty.toNumber(),
        });

        // Throw exception for insufficient stock
        throw new InsufficientStockException(
          product.id,
          product.name,
          baseQtyDeducted.toNumber(),
          prevQty.toNumber(),
        );
      }

      // Override allowed: proceed with negative balance
      this.logger.warn(
        `STOCK OVERRIDE APPLIED: Negative inventory balance allowed`,
        {
          userId,
          productId: product.id,
          newQuantity: newQty.toString(),
        },
      );
    }

    await tx.product.update({
      where: { id: product.id },
      data: {
        current_quantity: newQty,
        ...(newQty.isNegative() ? { needsRecount: true } : {}),
      },
    });

    return await tx.stockMovement.create({
      data: {
        productId: product.id,
        staffId: userId,
        date: new Date(),
        type: MovementType.OUT,
        current_uom: provided_uom,
        quantity_changed: baseQtyDeducted.times(-1),
        previous_quantity: prevQty,
        new_quantity: newQty,
        reason:
          allowOverride && newQty.isNegative()
            ? `${reason} (OVERRIDDEN)`
            : reason,
      },
    });
  }

  /*
  Stock-Out
  */
  async stockOut(
    userId: number,
    stockOutDto: StockOutDto,
  ): Promise<StockMovementResponseDto> {
    this.logger.log('Initiating inventory stock-out transaction', {
      userId,
      productId: stockOutDto.productId,
    });

    const movement = await this.prisma.$transaction(async (tx) => {
      return this.reduceProductStock(tx, {
        productId: stockOutDto.productId,
        quantityToDeduct: stockOutDto.taken_qty,
        provided_uom: stockOutDto.current_uom,
        userId,
        reason: stockOutDto.reason ?? 'Manual Stock-Out',
        allowOverride: stockOutDto.allowOverride ?? false,
        operation_name: 'Stock-out',
      });
    });

    return StockMovementResponseDto.fromEntity(movement);
  }

  /*
  Assign bin location to product
  */
  async assignBin(
    userId: number,
    productId: number,
    binDto: AssignBinDto,
  ): Promise<AssignBinResponseDto> {
    this.logger.log(`Initiating product bin update`, {
      userId,
      productId,
      binId: binDto.binId,
    });

    // 1. Check if bin location exists
    const binLoc = await this.prisma.binLocation.findUnique({
      where: { id: binDto.binId },
    });

    if (!binLoc) {
      this.logger.warn(
        `Assigning bin location failed: Bin location '${binDto.binId}' not found.`,
      );
      throw new NotFoundException(
        `Bin location with id '${binDto.binId}' not found.`,
      );
    }

    // 2. Perform update & include bin_location relation for the response mapper
    try {
      const updatedProduct = await this.prisma.product.update({
        where: { id: productId },
        data: { binId: binDto.binId },
        include: {
          bin_location: true,
        },
      });

      this.logger.log(`Product bin updated successfully`, {
        productId,
        binId: binDto.binId,
        userId,
      });

      return AssignBinResponseDto.fromEntity(updatedProduct);
    } catch (error) {
      // Prisma error code for Record to update not found
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.warn(
          `Assigning bin location failed: Product '${productId}' not found.`,
        );
        throw new NotFoundException(
          `Product with id '${productId}' not found.`,
        );
      }
      throw error;
    }
  }

  /*
  Retrieve products whose current quantity falls below ROP
  */
  async getProductsBelowROP() {
    this.logger.debug('Fetching products below reorder point');

    const products = await this.prisma.product.findMany({
      where: {
        current_quantity: {
          lte: this.prisma.product.fields.reorder_point_ROP,
        },
      },
      orderBy: {
        current_quantity: 'asc',
      },
    });

    return LowStockAlertsResponseDto.fromEntities(products);
  }

  /*
  Retrieve paginated stock movement audit history
  */
  async getStockMovements(
    queryDto: GetStockMovementsDto,
  ): Promise<PaginatedStockMovementsResponseDto> {
    const {
      productId,
      type,
      staffId,
      approvedById,
      isOverride,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = queryDto;

    this.logger.debug('Fetching stock movement history', { filters: queryDto });

    // Validate date logic
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      this.logger.warn('Stock movement query failed: startDate after endDate', {
        startDate,
        endDate,
      });
      throw new BadRequestException('startDate cannot be later than endDate');
    }

    const where: Prisma.StockMovementWhereInput = {
      ...(productId && { productId }),
      ...(type && { type }),
      ...(staffId && { staffId }),
      ...(approvedById && { approvedById }),
      ...(isOverride !== undefined && { isOverride }),
      ...((startDate || endDate) && {
        date: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      }),
    };

    const skip = (page - 1) * limit;

    const [movements, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          product: true,
          staff: true,
          approvedBy: true,
        },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return PaginatedStockMovementsResponseDto.fromEntities(
      movements,
      total,
      page,
      limit,
    );
  }
}
