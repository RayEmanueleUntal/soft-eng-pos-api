import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdjustInventoryDto, InventoryDto } from './dto';
import { MovementType } from 'src/generated/prisma/enums';
import { UOMMismatchException } from 'src/common/exceptions/uom-mismatch.exception';
import { Decimal } from '@prisma/client/runtime/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // Get inventory with query filters
  getInventory(userId: string, invDto: InventoryDto) {
    const { search, categoryId, size, thread, material } = invDto;

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

  // Adjust Inventory
  async adjustInventory(userId: number, adjustDto: AdjustInventoryDto) {
    return await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: adjustDto.productId },
      });

      if (!product) {
        throw new NotFoundException(`Product not found`);
      }

      // Validate UOM
      if (product.base_uom !== adjustDto.current_uom) {
        throw new UOMMismatchException(product.name, product.base_uom);
      }

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

      return movement;
    });
  }
}
