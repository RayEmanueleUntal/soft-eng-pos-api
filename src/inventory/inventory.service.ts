import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { InventoryDto } from './dto';

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

  // Stock-In
}
