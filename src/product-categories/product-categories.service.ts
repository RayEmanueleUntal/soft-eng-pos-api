import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetProductCategoryResponseDto } from './dto/responses';
import { GetCategoryByNameQueryDto } from './dto';

@Injectable()
export class ProductCategoriesService {
  private readonly logger = new Logger(ProductCategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch a single category by ID.
   */
  async getCategory(id: number): Promise<GetProductCategoryResponseDto> {
    this.logger.log(`Fetching category with ID: ${id}`);

    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      this.logger.warn(`Category lookup failed: ID ${id} not found`);
      throw new NotFoundException(`Product category with ID: ${id} not found.`);
    }

    return GetProductCategoryResponseDto.fromEntity(category);
  }

  /**
   * Retrieve all product categories (intended for dropdowns and filter menus).
   */
  async getAllCategories(): Promise<GetProductCategoryResponseDto[]> {
    this.logger.log('Fetching all product categories');

    const categories = await this.prisma.category.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    this.logger.log(`Successfully retrieved ${categories.length} categories.`);

    return categories.map(GetProductCategoryResponseDto.fromEntity);
  }

  /**
   * Search category by name (case-insensitive exact match) and return category info with ID.
   */
  async getCategoryByName(
    queryDto: GetCategoryByNameQueryDto,
  ): Promise<GetProductCategoryResponseDto> {
    const { name } = queryDto;
    this.logger.log(`Searching category by name: "${name}"`);

    const category = await this.prisma.category.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive',
        },
      },
    });

    if (!category) {
      this.logger.warn(`Category lookup failed: Name "${name}" not found`);
      throw new NotFoundException(
        `Product category with name "${name}" not found.`,
      );
    }

    this.logger.log(`Category found: "\({category.name}" (ID:\){category.id})`);

    return GetProductCategoryResponseDto.fromEntity(category);
  }
}
