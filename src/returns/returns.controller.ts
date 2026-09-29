import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from 'src/auth/guards';
import { CreateExchangeDto, CreateRefundDto, ReturnResponseDto } from './dto';
import { Idempotent } from 'src/common/decorators';

@ApiTags('Returns & Exchanges')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post('refund')
  @Idempotent()
  @ApiOperation({
    summary: 'Request a Refund',
    description:
      'Submits a refund request that will be routed to a manager for approval.',
  })
  @ApiResponse({ status: 201, type: ReturnResponseDto })
  async requestRefund(
    @Body() dto: CreateRefundDto,
    @Req() req: any,
  ): Promise<ReturnResponseDto> {
    // Assuming staffId is extracted from JWT
    const staffId = req.user.id;
    return this.returnsService.requestRefund(dto, staffId);
  }

  @Post('exchange')
  @Idempotent()
  @ApiOperation({
    summary: 'Request an Exchange',
    description:
      'Submits an exchange swap request. Triggers stock override warning if stock is insufficient.',
  })
  @ApiResponse({ status: 201, type: ReturnResponseDto })
  async requestExchange(
    @Body() dto: CreateExchangeDto,
    @Req() req: any,
  ): Promise<ReturnResponseDto> {
    const staffId = req.user.id;
    return this.returnsService.requestExchange(dto, staffId);
  }
}
