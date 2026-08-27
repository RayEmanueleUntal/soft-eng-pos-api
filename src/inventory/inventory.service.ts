import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AdjustInventoryDto,
  AssignBinDto,
  AssignBinResponseDto,
  InventoryDto,
  LowStockAlertsResponseDto,
  PaginatedInventoryResponseDto,
  StockOutDto,
} from './dto';
import { Prisma } from 'src/generated/prisma/client';
import { MovementType, UnitOfMeasure } from 'src/generated/prisma/enums';
import { UOMMismatchException } from 'src/common/exceptions/uom-mismatch.exception';
import { StockInDto } from './dto/requests/stock-in.dto';
import { TransactionClient } from 'src/generated/prisma/internal/prismaNamespace';
import { Product } from 'src/generated/prisma/client';
import { StockMovementResponseDto } from './dto/responses/stock-movement-response.dto';
import { InsufficientStockException } from 'src/common/exceptions/insufficient-stock.exception';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /*
    Get inventory with query filters
  */
  async getInventory(
    invDto: InventoryDto,
  ): Promise<PaginatedInventoryResponseDto> {
    const {
      search,
      categoryId,
      size,
      thread,
      material,
      page = 1,
      limit = 20,
    } = invDto;

    this.logger.debug('Fetching inventory list', { filters: invDto });

    // const where = {
    //   ...(search && {
    //     name: {
    //       contains: search,
    //       mode: 'insensitive' as const,
    //     },
    //   }),
    //   ...(categoryId && { categoryId }),
    //   ...(size && { size_dimensions: size }),
    //   ...(thread && { thread_type: thread }),
    //   ...(material && { material_grade: material }),
    // };

    // A. If the user types a general search strin glike "Hex Bolt Grade 8"
    const searchKeywords = search ? search.trim().split(/\s+/) : [];

    const where: any = {};

    if (searchKeywords.length > 0) {
      // Every keyword typed must match AT LEAST ONE of the searchable fields
      where.AND = searchKeywords.map((keyword) => ({
        OR: [
          { name: { contains: keyword, mode: 'insensitive' } },
          { sku: { contains: keyword, mode: 'insensitive' } },
          { size_dimensions: { contains: keyword, mode: 'insensitive' } },
          { thread_type: { contains: keyword, mode: 'insensitive' } },
          { material_grade: { contains: keyword, mode: 'insensitive' } },
        ],
      }));
    }

    // B. Keep explicit filters if they are provided via dropdowns
    if (categoryId) where.categoryId = categoryId;
    if (size) {
      where.size_dimensions = { contains: size, mode: 'insensitive' };
    }
    if (thread) {
      where.thread_type = { contains: thread, mode: 'insensitive' };
    }
    if (material) {
      where.material_grade = { contains: material, mode: 'insensitive' };
    }

    const skip = (page - 1) * limit;

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { bin_location: true },
      }),
      this.prisma.product.count({ where }),
    ]);

    return PaginatedInventoryResponseDto.fromEntities(
      products,
      total,
      page,
      limit,
    );
  }

  /*
  Helper method: Validates existence and UOM inside a transaction context
  */
  private async validateAndGetProduct(
    tx: TransactionClient,
    productId: number,
    providedUom: UnitOfMeasure,
    userId: number,
    operationName: string,
  ): Promise<Product> {
    const product = await tx.product.findUnique({ where: { id: productId } });

    // Check if product exists
    if (!product) {
      this.logger.warn(`${operationName} failed: Product not found`, {
        userId,
        productId,
      });

      throw new NotFoundException('Product not found');
    }

    // Validate UOM
    if (product.base_uom !== providedUom) {
      this.logger.warn(`${operationName} failed: UOM mismatch`, {
        userId,
        productId: product.id,
        expectedUom: product.base_uom,
        providedUom,
      });
      throw new UOMMismatchException(product.name, product.base_uom);
    }

    return product;
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
      const product = await this.validateAndGetProduct(
        tx,
        adjustDto.productId,
        adjustDto.current_uom,
        userId,
        'Inventory adjustment',
      );

      const previousQty = new Prisma.Decimal(product.current_quantity);
      const newQty = new Prisma.Decimal(adjustDto.new_count);
      const qtyChanged = newQty.minus(previousQty);

      const createdMovement = await tx.stockMovement.create({
        data: {
          productId: product.id,
          staffId: userId,
          date: adjustDto.date ?? new Date(),
          type: MovementType.ADJUSTMENT,
          current_uom: product.base_uom,
          quantity_changed: qtyChanged,
          previous_quantity: previousQty,
          new_quantity: newQty,
          reason: adjustDto.reason,
        },
      });

      await tx.product.update({
        where: { id: product.id },
        data: {
          current_quantity: newQty,
          needsRecount: false,
        },
      });

      this.logger.log('Inventory adjusted successfully', {
        movementId: createdMovement.id,
        productId: product.id,
        userId,
        previousQty: previousQty.toString(),
        newQty: newQty.toString(),
        qtyChanged: qtyChanged.toString(),
      });

      return createdMovement;
    });

    return StockMovementResponseDto.fromEntity(movement);
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
      const product = await this.validateAndGetProduct(
        tx,
        stockInDto.productId,
        stockInDto.current_uom,
        userId,
        'Stock-In',
      );

      const prevQty = new Prisma.Decimal(product.current_quantity);
      const addedQty = new Prisma.Decimal(stockInDto.added_qty);
      const newQty = prevQty.plus(addedQty);

      const createdMovement = await tx.stockMovement.create({
        data: {
          productId: product.id,
          staffId: userId,
          date: stockInDto.date ?? new Date(),
          type: MovementType.IN,
          current_uom: product.base_uom,
          quantity_changed: addedQty,
          previous_quantity: prevQty,
          new_quantity: newQty,
          reason: stockInDto.reason ?? 'Stock-In',
        },
      });

      await tx.product.update({
        where: { id: product.id },
        data: { current_quantity: newQty },
      });

      this.logger.log('Stock-in completed successfully', {
        movementId: createdMovement.id,
        productId: product.id,
        userId,
        addedQty: addedQty.toString(),
        newQty: newQty.toString(),
      });

      return createdMovement;
    });

    return StockMovementResponseDto.fromEntity(movement);
  }

  /*
  Helper function that reduces the stock
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

    const product = await this.validateAndGetProduct(
      tx,
      productId,
      provided_uom,
      userId,
      operation_name,
    );

    const prevQty = new Prisma.Decimal(product.current_quantity);
    const takenQty = new Prisma.Decimal(quantityToDeduct);
    const newQty = prevQty.minus(takenQty);

    if (newQty.isNegative()) {
      if (!allowOverride) {
        await tx.product.update({
          where: { id: productId },
          data: { needsRecount: true },
        });

        this.logger.warn(`Checkout failed: Insufficient stock`, {
          productId: product.id,
          productName: product.name,
          requested: takenQty.toNumber(),
          available: prevQty.toNumber(),
        });

        // Throw exception for insufficient stock
        throw new InsufficientStockException(
          product.id,
          product.name,
          takenQty.toNumber(),
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
        current_uom: product.pricing_uom ?? UnitOfMeasure.PCS,
        quantity_changed: takenQty.times(-1),
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
  Retrieve products whose current quanitity falls below ROP
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
}
