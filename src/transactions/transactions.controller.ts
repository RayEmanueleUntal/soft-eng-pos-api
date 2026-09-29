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
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import {
  GetReceiptResponseDto,
  GetTransactionsQueryDto,
  PaginatedTransactionsResponseDto,
} from './dto';

@Controller('transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /*
   * Fetch paginated list of transactions filtered by status, types, dates, or search criteria.
   */
  @Get()
  @ApiOperation({
    summary: 'Retrieve paginated transaction records',
    description:
      'Fetches transaction history with flexible filters (date range, staff, customer, status) and optional includes (shipments, returns, exchanges).',
  })
  @ApiOkResponse({
    type: PaginatedTransactionsResponseDto,
    description:
      'Paginated list of transactions with calculated summary metrics.',
  })
  async getTransactions(
    @Query() queryDto: GetTransactionsQueryDto,
  ): Promise<PaginatedTransactionsResponseDto> {
    return this.transactionsService.getTransactions(queryDto);
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
    return await this.transactionsService.getReceipt(id);
  }
}
