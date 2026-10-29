import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CurrentUser, Roles } from 'src/auth/decorators';
import { AssignedRole as Role } from 'src/generated/prisma/enums';
import { JwtAuthGuard, RolesGuard } from 'src/auth/guards';
import {
  AdjustInventoryDto,
  AssignBinDto,
  AssignBinResponseDto,
  GetStockMovementsDto,
  LowStockAlertsResponseDto,
  PaginatedStockMovementsResponseDto,
  StockInDto,
  StockMovementResponseDto,
  StockOutDto,
} from './dto';
import { Idempotent } from 'src/common/decorators';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /*
  Adjust Inventory
  */
  @Post('adjust')
  @Idempotent()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STOCK_MANAGEMENT)
  @ApiOperation({
    summary: 'Manually adjust stock quantity for a product',
    description:
      'Performs a physical stock recount or inventory override. Input count is automatically converted from current_uom into canonical base units.',
  })
  @ApiOkResponse({
    description: 'Stock adjustment record created successfully.',
    type: StockMovementResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Product specified in request body was not found.',
  })
  @ApiBadRequestResponse({
    description:
      'Provided UOM is invalid for this product or invalid body parameters.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid authentication JWT token.',
  })
  @ApiForbiddenResponse({
    description: 'User does not possess sufficient role privileges.',
  })
  adjustInventory(
    @CurrentUser() user: { id: number },
    @Body() adjustDto: AdjustInventoryDto,
  ): Promise<StockMovementResponseDto> {
    return this.inventoryService.adjustInventory(user.id, adjustDto);
  }

  /*
  Stock-In
  */
  @Post('stock-in')
  @Idempotent()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STOCK_MANAGEMENT)
  @ApiOperation({
    summary: 'Increase stock quantity for a product',
    description:
      'Increases inventory stock level for a product. Automatically handles alternate package UoM conversions to base units before updating current_quantity.',
  })
  @ApiOkResponse({
    description: 'Stock-in record created successfully.',
    type: StockMovementResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Product specified in request body was not found.',
  })
  @ApiBadRequestResponse({
    description:
      'Provided UOM is invalid for this product or invalid body parameters.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid authentication JWT token.',
  })
  @ApiForbiddenResponse({
    description: 'User does not possess sufficient role privileges.',
  })
  stockIn(
    @CurrentUser() user: { id: number },
    @Body() stockInDto: StockInDto,
  ): Promise<StockMovementResponseDto> {
    return this.inventoryService.stockIn(user.id, stockInDto);
  }

  /*
  Stock-Out
  */
  @Post('stock-out')
  @Idempotent()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STOCK_MANAGEMENT)
  @ApiOperation({
    summary: 'Decrease stock quantity for a product',
    description:
      'Deducts inventory stock level for a product. Verifies available base stock unless allowOverride flag is enabled.',
  })
  @ApiOkResponse({
    description: 'Stock-out record created successfully.',
    type: StockMovementResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Product specified in request body was not found.',
  })
  @ApiBadRequestResponse({
    description: 'Insufficient stock available or invalid UOM provided.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid authentication JWT token.',
  })
  @ApiForbiddenResponse({
    description: 'User does not possess sufficient role privileges.',
  })
  stockOut(
    @CurrentUser() user: { id: number },
    @Body() stockOutDto: StockOutDto,
  ): Promise<StockMovementResponseDto> {
    return this.inventoryService.stockOut(user.id, stockOutDto);
  }

  /* 
  Assign bin location to product
  */
  @Patch(':id/bin')
  @Idempotent()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STOCK_MANAGEMENT)
  @ApiOperation({
    summary: 'Assign bin location to product',
    description:
      'Updates the bin location assignment (aisle and shelf location) for a specific product.',
  })
  @ApiOkResponse({
    description: 'Product assigned bin updated successfully.',
    type: AssignBinResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Product ID or Bin Location ID was not found.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid authentication JWT token.',
  })
  @ApiForbiddenResponse({
    description: 'User does not possess sufficient role privileges.',
  })
  assignBin(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) productId: number,
    @Body() binDto: AssignBinDto,
  ): Promise<AssignBinResponseDto> {
    return this.inventoryService.assignBin(user.id, productId, binDto);
  }

  /*
   Retrieve products whose current quantity falls below ROP
  */
  @Get('rop')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SECRETARY, Role.STOCK_MANAGEMENT)
  @ApiOperation({
    summary: 'Get all products reaching or falling below Reorder Point (ROP)',
    description:
      'Retrieves low stock alert items where current base quantity is less than or equal to reorder_point_ROP.',
  })
  @ApiOkResponse({
    description: 'List of low stock products successfully retrieved.',
    type: LowStockAlertsResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid authentication JWT token.',
  })
  @ApiForbiddenResponse({
    description: 'User does not possess sufficient role privileges.',
  })
  getProductsBelowROP(): Promise<LowStockAlertsResponseDto> {
    return this.inventoryService.getProductsBelowROP();
  }

  /*
  Retrieve paginated stock movement audit history
  */
  @Get('movements')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SECRETARY, Role.STOCK_MANAGEMENT)
  @ApiOperation({
    summary: 'Get paginated stock movement history',
    description:
      'Retrieves audit records of inventory movements (IN, OUT, SALE, RETURN, ADJUSTMENT) filtered by product, staff, type, override flag, and date range.',
  })
  @ApiOkResponse({
    description: 'Successfully fetched stock movement history.',
    type: PaginatedStockMovementsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters or date bounds provided.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid authentication JWT token.',
  })
  @ApiForbiddenResponse({
    description: 'User does not possess sufficient role privileges.',
  })
  async getStockMovements(
    @Query() queryDto: GetStockMovementsDto,
  ): Promise<PaginatedStockMovementsResponseDto> {
    return this.inventoryService.getStockMovements(queryDto);
  }
}
