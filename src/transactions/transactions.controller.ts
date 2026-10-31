import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard, RolesGuard } from 'src/auth/guards';
import { Roles } from 'src/auth/decorators';
import { AssignedRole as Role } from 'src/generated/prisma/enums';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  GetReceiptResponseDto,
  GetTransactionsQueryDto,
  PaginatedTransactionsResponseDto,
} from './dto';

@ApiTags('Transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * Fetch paginated list of transactions filtered by status, types, dates, or search criteria.
   */
  @Get()
  @Roles(
    Role.ADMIN,
    Role.MANAGER,
    Role.SECRETARY,
    Role.CASHIER,
    Role.SALES_CLERK,
    Role.STOCK_MANAGEMENT,
  )
  @ApiOperation({
    summary: 'Retrieve paginated transaction records',
    description:
      'Fetches transaction history with flexible filters (date range, staff, customer, status, transaction type) and optional relation includes (shipments, returns, exchanges).',
  })
  @ApiOkResponse({
    type: PaginatedTransactionsResponseDto,
    description:
      'Paginated list of transactions with item snapshots and payment records retrieved successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid search filters or query parameters submitted.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT authentication token.',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient RBAC permissions to access transaction logs.',
  })
  async getTransactions(
    @Query() queryDto: GetTransactionsQueryDto,
  ): Promise<PaginatedTransactionsResponseDto> {
    return this.transactionsService.getTransactions(queryDto);
  }

  /**
   * Get printable receipt details by transaction ID with optional inclusion of shipments, returns, and exchanges.
   */
  @Get('receipt/:id')
  @Roles(
    Role.ADMIN,
    Role.MANAGER,
    Role.SECRETARY,
    Role.CASHIER,
    Role.SALES_CLERK,
    Role.STOCK_MANAGEMENT,
  )
  @ApiOperation({
    summary: 'Get printable receipt details by transaction ID',
    description:
      'Retrieves complete receipt details including cashier information, customer details, line item pricing/UOM breakdowns, payment summaries, and optional relation records (shipments, returns, exchanges).',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Unique numerical ID of the transaction',
    example: 101,
  })
  @ApiQuery({
    name: 'includeShipments',
    type: Boolean,
    required: false,
    description: 'Include associated shipment tracking information',
    example: false,
  })
  @ApiQuery({
    name: 'includeReturns',
    type: Boolean,
    required: false,
    description: 'Include item return and refund history for this transaction',
    example: false,
  })
  @ApiQuery({
    name: 'includeExchanges',
    type: Boolean,
    required: false,
    description: 'Include item exchange records for this transaction',
    example: false,
  })
  @ApiOkResponse({
    type: GetReceiptResponseDto,
    description: 'Receipt details retrieved successfully.',
  })
  @ApiNotFoundResponse({
    description: 'Transaction ID not found.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid transaction ID or query parameter format supplied.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT authentication token.',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient RBAC permissions to view receipt details.',
  })
  async getReceipt(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeShipments') includeShipments?: boolean,
    @Query('includeReturns') includeReturns?: boolean,
    @Query('includeExchanges') includeExchanges?: boolean,
  ): Promise<GetReceiptResponseDto> {
    // Parse query param values (converting potential query string values safely to booleans)
    const shouldIncludeShipments = String(includeShipments) === 'true';
    const shouldIncludeReturns = String(includeReturns) === 'true';
    const shouldIncludeExchanges = String(includeExchanges) === 'true';

    return await this.transactionsService.getReceipt(
      id,
      shouldIncludeShipments,
      shouldIncludeReturns,
      shouldIncludeExchanges,
    );
  }
}
