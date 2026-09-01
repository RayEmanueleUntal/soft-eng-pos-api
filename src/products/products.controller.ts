import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { Idempotent } from 'src/common/decorators';
import { CurrentUser, Roles } from 'src/auth/decorators';
import { AssignedRole as Role } from 'src/generated/prisma/enums';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateProductDto, ProductResponseDto } from './dto';
import { UpdateProductDto } from './dto/request/update-product.dto';
import { DeleteProductResponseDto } from './dto/response/delete-product-response.dto';
import { DeleteProductQueryDto } from './dto/request/delete-product-query.dto';
import { JwtAuthGuard, RolesGuard } from 'src/auth/guards';

@ApiTags('Products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * Update an existing Product by ID
   */
  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SECRETARY)
  @Idempotent()
  @ApiOperation({
    summary: 'Update existing product details by ID',
    description:
      'Modifies attributes, pricing, or locations. Requires confirmUomChange=true if modifying base_uom on existing products.',
  })
  @ApiOkResponse({
    description: 'Product updated successfully.',
    type: ProductResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Product ID, Category ID, or BinLocation ID does not exist.',
  })
  @ApiConflictResponse({
    description:
      'SKU collision or matching fastener specification collision (bypassable via allowDuplicate=true).',
  })
  @ApiBadRequestResponse({
    description:
      'Attempted to modify base_uom without confirmUomChange=true, or invalid body payload.',
  })
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    return this.productsService.updateProduct(id, user.id, updateProductDto);
  }

  /**
   * Delete a Product by ID with transaction safety checks
   */
  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @Idempotent()
  @ApiOperation({
    summary: 'Delete a product by ID',
    description:
      'Removes a product entity. Fails if the product has associated stock movements, POS sales, or PO records to maintain audit logs.',
  })
  @ApiOkResponse({
    description: 'Product deleted successfully.',
    type: DeleteProductResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Product ID does not exist.',
  })
  @ApiConflictResponse({
    description:
      'Product has existing transaction history (sales, purchase orders, movements) and cannot be hard deleted.',
  })
  async deleteProduct(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
    @Query() queryDto: DeleteProductQueryDto,
  ): Promise<DeleteProductResponseDto> {
    return this.productsService.deleteProduct(id, user.id, queryDto);
  }

  /**
   * Create a new product with duplicate checking and relation validation
   */
  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SECRETARY)
  @Idempotent()
  @ApiOperation({
    summary: 'Create a new product record',
    description:
      'Creates a product linked to a Category and optional BinLocation. Checks for duplicate SKUs and identical fastener specifications.',
  })
  @ApiCreatedResponse({
    description: 'Product created successfully.',
    type: ProductResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Specified Category ID or BinLocation ID does not exist.',
  })
  @ApiConflictResponse({
    description:
      'SKU is already taken, or a product with matching size, thread, and material specs exists (bypassable via allowDuplicate=true).',
  })
  @ApiBadRequestResponse({
    description: 'Invalid body parameters or data formatting errors.',
  })
  async createProduct(
    @CurrentUser() user: { id: number },
    @Body() createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    return this.productsService.createProduct(user.id, createProductDto);
  }
}
