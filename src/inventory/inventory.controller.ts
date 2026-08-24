import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CurrentUser, Roles } from 'src/auth/decorators';
import { AssignedRole as Role } from 'src/generated/prisma/enums';
import { JwtAuthGuard, RolesGuard } from 'src/auth/guards';
import {
  AdjustInventoryDto,
  InventoryDto,
  StockInDto,
  StockOutDto,
} from './dto';
import { Idempotent } from 'src/common/decorators';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // Adjust Inventory
  @Post('adjust')
  @Idempotent()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STOCK_MANAGEMENT)
  adjustInventory(
    @CurrentUser() user: { id: number },
    @Body() adjustDto: AdjustInventoryDto,
  ) {
    return this.inventoryService.adjustInventory(user.id, adjustDto);
  }

  // Stock-In
  @Post('stock-in')
  @Idempotent()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STOCK_MANAGEMENT)
  stockIn(@CurrentUser() user: { id: number }, @Body() stockInDto: StockInDto) {
    return this.inventoryService.stockIn(user.id, stockInDto);
  }

  // Stock-Out
  @Post('stock-out')
  @Idempotent()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STOCK_MANAGEMENT)
  stockOut(
    @CurrentUser() user: { id: number },
    @Body() stockOutDto: StockOutDto,
  ) {
    return this.inventoryService.stockOut(user.id, stockOutDto);
  }

  // Get inventory with query filters
  @Get()
  getInventory(@Query() invDto: InventoryDto) {
    return this.inventoryService.getInventory(invDto);
  }
}
