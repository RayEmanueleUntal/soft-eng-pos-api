import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard, RolesGuard } from 'src/auth/guards';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { GetReceiptResponseDto } from './dto';

@Controller('transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

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
