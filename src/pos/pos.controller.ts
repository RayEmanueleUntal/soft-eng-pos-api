import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PosService } from './pos.service';
import { JwtAuthGuard, RolesGuard } from 'src/auth/guards';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import {
  CheckoutDto,
  CheckoutTransactionResponseDto,
  GetProductsDto,
  GetReceiptResponseDto,
  PaginatedProductsResponseDto,
} from './dto';
import { Idempotent } from 'src/common/decorators';
import { CurrentUser, Roles } from 'src/auth/decorators';
import { AssignedRole as Role } from 'src/generated/prisma/enums';

@Controller('pos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PosController {
  constructor(private readonly posService: PosService) {}

  /*
  Checkout items
  */
  @Post('/checkout')
  @Idempotent()
  @ApiOperation({ summary: 'Checkout transaction of items' })
  @ApiOkResponse({
    description: 'Transaction record created successfully',
    type: CheckoutTransactionResponseDto,
  })
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
  checkout(
    @CurrentUser() user: { id: number },
    @Body() checkoutDto: CheckoutDto,
  ) {
    return this.posService.checkout(user.id, checkoutDto);
  }

  /*
  Get a list of products based on the query
  */
  @Get('/products')
  @ApiOperation({
    summary: 'Get all products from inventory based on the query parameters.',
  })
  @ApiOkResponse({
    description: 'Paginated list of product items successfully retrieved.',
    type: PaginatedProductsResponseDto,
  })
  getProducts(
    @Query() productsDto: GetProductsDto,
  ): Promise<PaginatedProductsResponseDto> {
    return this.posService.getProducts(productsDto);
  }

  /*
  Get receipt by transaction ID
  */
  @Get('receipt/:id')
  @ApiOperation({ summary: 'Get printable receipt details by transaction ID' })
  @ApiOkResponse({
    description: 'Receipt details retrieved successfully.',
    type: GetReceiptResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Transaction ID not found.' })
  async getReceipt(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<GetReceiptResponseDto> {
    return await this.posService.getReceipt(id);
  }
}
