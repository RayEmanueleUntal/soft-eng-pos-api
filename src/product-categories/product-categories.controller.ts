import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductCategoriesService } from './product-categories.service';
import { JwtAuthGuard, RolesGuard } from 'src/auth/guards';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GetProductCategoryResponseDto } from './dto/responses';
import { GetCategoryByNameQueryDto } from './dto';

@ApiTags('Product Categories')
@Controller('product-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductCategoriesController {
  constructor(
    private readonly productCategoriesService: ProductCategoriesService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get all product categories',
    description:
      'Retrieves a complete list of product categories ordered alphabetically by name.',
  })
  @ApiOkResponse({
    type: [GetProductCategoryResponseDto],
    description: 'List of all categories retrieved successfully.',
  })
  async getAllCategories(): Promise<GetProductCategoryResponseDto[]> {
    return this.productCategoriesService.getAllCategories();
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search category by name',
    description:
      'Finds a category by name (case-insensitive) and returns its ID and details.',
  })
  @ApiOkResponse({
    type: GetProductCategoryResponseDto,
    description: 'Category found successfully.',
  })
  @ApiNotFoundResponse({
    description: 'Category with the given name does not exist.',
  })
  async getCategoryByName(
    @Query() queryDto: GetCategoryByNameQueryDto,
  ): Promise<GetProductCategoryResponseDto> {
    return this.productCategoriesService.getCategoryByName(queryDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get category by ID',
    description: 'Retrieves category details for a given category ID.',
  })
  @ApiOkResponse({
    type: GetProductCategoryResponseDto,
    description: 'Category retrieved successfully.',
  })
  @ApiNotFoundResponse({
    description: 'Category with the specified ID was not found.',
  })
  async getCategory(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<GetCategoryByNameQueryDto> {
    return this.productCategoriesService.getCategory(id);
  }
}
