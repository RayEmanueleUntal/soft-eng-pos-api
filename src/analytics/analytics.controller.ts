import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from 'src/auth/guards';
import { Roles } from 'src/auth/decorators';
import { AssignedRole } from 'src/generated/prisma/enums';
import {
  AccountsReceivableQueryDto,
  AccountsReceivableResponseDto,
  AnalyticsQueryDto,
  DashboardSummaryResponseDto,
  ExpenseAnalyticsQueryDto,
  ExpenseAnalyticsResponseDto,
  InventoryVelocityQueryDto,
  InventoryVelocityResponseDto,
  SalesPerformanceQueryDto,
  SalesPerformanceResponseDto,
} from './dto';

@ApiTags('Analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard-summary')
  @Roles(AssignedRole.ADMIN, AssignedRole.MANAGER)
  @ApiOperation({
    summary: 'Get real-time Analytics Dashboard summary metrics',
    description:
      'Calculates real-time executive KPI cards for the selected date range: Total Sales Revenue, COGS, Gross Profit & Margin %, Total OpEx, Net Profit & Margin %, and Total Active Accounts Receivable.',
  })
  @ApiOkResponse({
    description: 'Dashboard metrics successfully aggregated.',
    type: DashboardSummaryResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input parameters (e.g., startDate is after endDate).',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication token missing or invalid.',
  })
  @ApiForbiddenResponse({
    description:
      'User lacks required permissions (Requires ADMIN or MANAGER role).',
  })
  async getDashboardSummary(
    @Query() query: AnalyticsQueryDto,
  ): Promise<DashboardSummaryResponseDto> {
    return this.analyticsService.getDashboardSummary(query);
  }

  @Get('sales-performance')
  @Roles(AssignedRole.ADMIN, AssignedRole.MANAGER)
  @ApiOperation({
    summary: 'Get Financial Performance & Sales Report',
    description:
      'Returns Sales & Net Profit trends over time (Daily, Weekly, Monthly), payment method breakdowns (CASH, GCASH, CREDIT, etc.), and a summary ledger (Revenue, Discounts, COGS, Gross Profit Margin %).',
  })
  @ApiOkResponse({
    description: 'Sales performance analytics generated successfully.',
    type: SalesPerformanceResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid date filter or grouping parameter.',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication token missing or invalid.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: Requires ADMIN or MANAGER role.',
  })
  async getSalesPerformance(
    @Query() query: SalesPerformanceQueryDto,
  ): Promise<SalesPerformanceResponseDto> {
    return this.analyticsService.getSalesPerformance(query);
  }

  @Get('expenses')
  @Roles(AssignedRole.ADMIN, AssignedRole.MANAGER)
  @ApiOperation({
    summary: 'Get Operational Expenses (OpEx) Analytics & Ledger',
    description:
      'Generates Operational Expenses report including visual category spending breakdown (RENT, UTILITIES, SALARIES, etc.) and a detailed paginated table of expense logs with staff info.',
  })
  @ApiOkResponse({
    description: 'Expense analytics report retrieved successfully.',
    type: ExpenseAnalyticsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid date filter or query pagination parameters.',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication token missing or invalid.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: Requires ADMIN or MANAGER role.',
  })
  async getExpenseAnalytics(
    @Query() query: ExpenseAnalyticsQueryDto,
  ): Promise<ExpenseAnalyticsResponseDto> {
    return this.analyticsService.getExpenseAnalytics(query);
  }

  @Get('inventory-velocity')
  @Roles(AssignedRole.ADMIN, AssignedRole.MANAGER)
  @ApiOperation({
    summary: 'Get Product Inventory Velocity Report (Fast & Slow-Moving Items)',
    description:
      'Analyzes product sales frequency and stock movement velocity. Generates a top-selling fast-moving items table (ranked by volume or revenue) and a slow-moving/dead-stock table with tied-up capital and aging days.',
  })
  @ApiOkResponse({
    description: 'Inventory velocity report generated successfully.',
    type: InventoryVelocityResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters or date bounds.',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication token missing or invalid.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: Requires ADMIN or MANAGER role.',
  })
  async getInventoryVelocity(
    @Query() query: InventoryVelocityQueryDto,
  ): Promise<InventoryVelocityResponseDto> {
    return this.analyticsService.getInventoryVelocity(query);
  }

  @Get('accounts-receivable')
  @Roles(AssignedRole.ADMIN, AssignedRole.MANAGER)
  @ApiOperation({
    summary: 'Get Customer Accounts Receivable (AR) & Credit Analytics',
    description:
      'Provides wholesale customer credit insights including total credit extended vs outstanding debt, an AR debt aging table (Current, 1-30, 31-60, 60+ days overdue), and top credit customer rankings.',
  })
  @ApiOkResponse({
    description: 'Accounts receivable analytics retrieved successfully.',
    type: AccountsReceivableResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters.',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication token missing or invalid.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: Requires ADMIN or MANAGER role.',
  })
  async getAccountsReceivableAnalytics(
    @Query() query: AccountsReceivableQueryDto,
  ): Promise<AccountsReceivableResponseDto> {
    return this.analyticsService.getAccountsReceivableAnalytics(query);
  }
}
