import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetProductCategoryResponseDto } from './dto/responses';

@Injectable()
export class ProductCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /*
  Get Category By ID
  */
  async getCategory(id: number): Promise<GetProductCategoryResponseDto> {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Product category with ID: ${id} not found.`);
    }

    return GetProductCategoryResponseDto.fromEntities(id, category.name);
  }
}
