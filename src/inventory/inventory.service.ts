import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdjustInventoryDto, InventoryDto, StockOutDto } from './dto';
import { MovementType } from 'src/generated/prisma/enums';
import { UOMMismatchException } from 'src/common/exceptions/uom-mismatch.exception';
import { Decimal } from '@prisma/client/runtime/client';
import { StockInDto } from './dto/stock-in.dto';
import { TransactionClient } from 'src/generated/prisma/internal/prismaNamespace';
import { Product } from 'src/generated/prisma/client';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private prisma: PrismaService) {}

  // Get inventory with query filters
  getInventory(invDto: InventoryDto) {
    const { search, categoryId, size, thread, material } = invDto;

    this.logger.debug('Fetching inventory list', { filters: invDto });

    return this.prisma.product.findMany({
      where: {
        ...(search && {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        }),
        ...(categoryId && { categoryId }),
        ...(size && { size_dimensions: size }),
        ...(thread && { thread_type: thread }),
        ...(material && { material_grade: material }),
      },
    });
  }

  // Helper method: Validates existence and UOM inside a transaction context
  private async validateAndGetProduct(
    tx: TransactionClient,
    productId: number,
    providedUom: string,
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

  // Adjust Inventory
  async adjustInventory(userId: number, adjustDto: AdjustInventoryDto) {
    this.logger.log('Initiating inventory adjustment transaction', {
      userId,
      productId: adjustDto.productId,
    });

    return await this.prisma.$transaction(async (tx) => {
      const product = await this.validateAndGetProduct(
        tx,
        adjustDto.productId,
        adjustDto.current_uom,
        userId,
        'Inventory adjustment',
      );

      const previousQty = new Decimal(product.current_quantity);
      const newQty = new Decimal(adjustDto.new_count);
      const qtyChanged = newQty.minus(previousQty);

      // Create audit record
      const movement = await tx.stockMovement.create({
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
        where: {
          id: product.id,
        },
        data: {
          current_quantity: newQty,
          needsRecount: false,
        },
      });

      this.logger.log('Inventory adjusted successfully', {
        movementId: movement.id,
        productId: product.id,
        userId,
        previousQty: previousQty.toString(),
        newQty: newQty.toString(),
        qtyChanged: qtyChanged.toString(),
      });

      return movement;
    });
  }

  // Stock-In
  async stockin(userId: number, stockInDto: StockInDto) {
    (this.logger.log('Initiating inventory stock-in transaction'),
      {
        userId,
        productId: stockInDto.productId,
      });

    return await this.prisma.$transaction(async (tx) => {
      const product = await this.validateAndGetProduct(
        tx,
        stockInDto.productId,
        stockInDto.current_uom,
        userId,
        'Stock-In',
      );

      const prevQty = new Decimal(product.current_quantity);
      const addedQty = new Decimal(stockInDto.added_qty);
      const newQty = prevQty.plus(addedQty);

      const movement = await tx.stockMovement.create({
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
        movementId: movement.id,
        productId: product.id,
        userId,
        addedQty: addedQty.toString(),
        newQty: newQty.toString(),
      });

      return movement;
    });
  }

  // Stock-Out
  async stockOut(userId: number, stockOutDto: StockOutDto) {
    (this.logger.log('Initiating inventory stock-out transaction'),
      {
        userId,
        productId: stockOutDto.productId,
      });

    return await this.prisma.$transaction(async (tx) => {
      const product = await this.validateAndGetProduct(
        tx,
        stockOutDto.productId,
        stockOutDto.current_uom,
        userId,
        'Stock-Out',
      );

      const prevQty = new Decimal(product.current_quantity);
      const takenQty = new Decimal(stockOutDto.added_qty);
      const newQty = prevQty.minus(takenQty);

      // ADD LOGIC TO HANDLE NEGATIVE STOCK

      const movement = await tx.stockMovement.create({
        data: {
          productId: product.id,
          staffId: userId,
          date: stockOutDto.date ?? new Date(),
          type: MovementType.OUT,
          current_uom: product.base_uom,
          quantity_changed: takenQty.times(-1),
          previous_quantity: prevQty,
          new_quantity: newQty,
          reason: stockOutDto.reason ?? 'Stock-Out',
        },
      });

      await tx.product.update({
        where: { id: product.id },
        data: { current_quantity: newQty },
      });

      this.logger.log('Stock-out completed successfully', {
        movementId: movement.id,
        productId: product.id,
        userId,
        takenQty: takenQty.toString(),
        newQty: newQty.toString(),
      });

      return movement;
    });
  }
}
