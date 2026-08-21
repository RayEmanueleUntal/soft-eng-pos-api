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
    const product = await this.prisma.product.findUnique({
      where: { id: adjustDto.productId },
    });

    // Check if product exists
    if (!product) {
      throw new NotFoundException(`Product not found`);
    }

    // Check if product base uom matches the adjusted inventory uom
    if (product.base_uom !== adjustDto.current_uom) {
      throw new UOMMismatchException(product.name, product.base_uom);
    }

    await this.prisma.$transaction([
      this.prisma.stockMovement.create({
        data: {
          productId: adjustDto.productId,
          staffId: userId,
          date: adjustDto.date,
          type: MovementType.ADJUSTMENT,
          current_uom: product.base_uom,
          quantity_changed: new Decimal(adjustDto.new_count).minus(
            product.current_quantity,
          ),
          previous_quantity: product.current_quantity,
          new_quantity: adjustDto.new_count,
          reason: adjustDto.reason,
        },
      }),
      this.prisma.product.update({
        where: { id: product.id },
        data: { current_quantity: adjustDto.new_count },
      }),
    ]);
  }
}
