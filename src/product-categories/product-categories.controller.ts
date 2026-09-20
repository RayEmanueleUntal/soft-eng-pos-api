import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
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

@ApiTags('Product Categories')
@Controller('product-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductCategoriesController {
  constructor(
    private readonly productCategoriesService: ProductCategoriesService,
  ) {}

  @Get('/:id')
  @ApiOperation({ summary: 'Get product category detail by category ID' })
  @ApiOkResponse({
    description: 'Product category details retrieved successfully',
    type: GetProductCategoryResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Product category ID not found.' })
  async getProductCategory(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<GetProductCategoryResponseDto> {
    return this.productCategoriesService.getCategory(id);
  }
}
