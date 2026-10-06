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
  InventoryDto,
  LowStockAlertsResponseDto,
  PaginatedInventoryResponseDto,
  PaginatedStockMovementsResponseDto,
  StockInDto,
  StockMovementResponseDto,
  StockOutDto,
} from './dto';
import { Idempotent } from 'src/common/decorators';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /*
  Adjust Inventory
  */
  @Post('adjust')
  @Idempotent()
  @ApiOperation({ summary: 'Manually adjust stock quantity for a product' })
  @ApiOkResponse({
    description: 'Stock adjustment record created successfully.',
    type: StockMovementResponseDto,
  })
  @Roles(Role.ADMIN, Role.MANAGER, Role.STOCK_MANAGEMENT)
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
  @ApiOperation({ summary: 'Increase stock quantity for a product' })
  @ApiOkResponse({
    description: 'Stock in record created successfully.',
    type: StockMovementResponseDto,
  })
  @Roles(Role.ADMIN, Role.MANAGER, Role.STOCK_MANAGEMENT)
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
  @ApiOperation({ summary: 'Decrease stock quantity for a product' })
  @ApiOkResponse({
    description: 'Stock out record created successfully.',
    type: StockMovementResponseDto,
  })
  @Roles(Role.ADMIN, Role.MANAGER, Role.STOCK_MANAGEMENT)
  stockOut(
    @CurrentUser() user: { id: number },
    @Body() stockOutDto: StockOutDto,
  ) {
    return this.inventoryService.stockOut(user.id, stockOutDto);
  }

  /* 
  Assign bin location to product
  */
  @Patch(':id/bin')
  @Idempotent()
  @ApiOperation({ summary: 'Assign bin location to product' })
  @ApiOkResponse({
    description: 'Product assigned bin updated successfully.',
    type: AssignBinResponseDto,
  })
  @Roles(Role.ADMIN, Role.MANAGER, Role.STOCK_MANAGEMENT)
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
  @ApiOperation({
    summary: 'Get all products reaching or falling below Reorder Point (ROP)',
  })
  @ApiOkResponse({
    description: 'List of low stock products successfully retrieved.',
    type: LowStockAlertsResponseDto,
  })
  getProductsBelowROP() {
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
    description: 'Successfully fetched stock movement history',
    type: PaginatedStockMovementsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters or date bounds provided',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid authentication JWT token',
  })
  @ApiForbiddenResponse({
    description: 'User does not possess sufficient role privileges',
  })
  async getStockMovements(
    @Query() queryDto: GetStockMovementsDto,
  ): Promise<PaginatedStockMovementsResponseDto> {
    return this.inventoryService.getStockMovements(queryDto);
  }

  /*
  Get inventory with query filters
  */
  @Get()
  @ApiOperation({
    summary: 'Get all products from inventory based on the query parameters.',
  })
  @ApiOkResponse({
    description: 'Paginated list of inventory items successfully retrieved.',
    type: PaginatedInventoryResponseDto,
  })
  getInventory(
    @Query() invDto: InventoryDto,
  ): Promise<PaginatedInventoryResponseDto> {
    return this.inventoryService.getInventory(invDto);
  }
}
