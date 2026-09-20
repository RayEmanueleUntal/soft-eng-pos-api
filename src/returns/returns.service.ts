import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalService } from 'src/approval/approval.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SystemSettingsService } from 'src/system-settings/system-settings.service';
import { CreateRefundDto, CreateExchangeDto, ReturnResponseDto } from './dto';
import { RequestType } from 'src/generated/prisma/enums';

@Injectable()
export class ReturnsService {
  private readonly logger = new Logger(ReturnsService.name);

  constructor(
    private readonly approvalService: ApprovalService,
    private readonly prisma: PrismaService,
    private readonly systemSettingsService: SystemSettingsService,
  ) {}

  /**
   * Helper method to verify if the transaction is within the dynamic return window.
   */
  private async validateReturnWindow(transactionId: number): Promise<boolean> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction #${transactionId} not found`);
    }

    // Fetch dynamic return window setting, defaulting to 7 days
    const returnWindowDays = await this.systemSettingsService.getNumber(
      'RETURN_WINDOW_DAYS',
      7,
    );

    // Calculate days passed since transaction
    const txDate = transaction.date;
    const now = new Date();

    const diffTime = now.getTime() - txDate.getTime();

    // Calculate difference in days (using Math.floor ensures we count full 24-hour periods)
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const isWithinWindow = diffDays <= returnWindowDays;

    if (!isWithinWindow) {
      this.logger.warn(
        `Transaction #${transactionId} rejected. Exceeds ${returnWindowDays} day return window.`,
      );
      throw new BadRequestException(
        `Transaction #${transactionId} is past the allowed ${returnWindowDays}-day return window.`,
      );
    }

    return isWithinWindow;
  }

  async requestRefund(
    dto: CreateRefundDto,
    staffId: number,
  ): Promise<ReturnResponseDto> {
    this.logger.log(
      `Staff #${staffId} initiating Refund request for Tx #${dto.transactionId}`,
    );

    // 1. Date Verification
    await this.validateReturnWindow(dto.transactionId);

    // 2. Create Approval Request (Passing staffId as the 2nd argument to match your ApprovalService)
    const approvalRequest = await this.approvalService.createRequest(
      {
        type: RequestType.REFUND_TRANSACTION,
        payload: {
          transactionId: dto.transactionId,
          productId: dto.productId,
          quantity: dto.quantity,
          condition: dto.condition,
          reason: dto.reason,
        },
      },
      staffId,
    );

    return {
      message: 'Refund requested and pending manager approval.',
      approvalRequestId: approvalRequest.id,
    };
  }

  async requestExchange(
    dto: CreateExchangeDto,
    staffId: number,
  ): Promise<ReturnResponseDto> {
    this.logger.log(
      `Staff #${staffId} initiating Exchange request for Tx #${dto.transactionId}`,
    );

    // 1. Date Verification
    const isWithinWindow = await this.validateReturnWindow(dto.transactionId);

    // 2. Create Approval Request
    const approvalRequest = await this.approvalService.createRequest(
      {
        type: RequestType.EXCHANGE_TRANSACTION,
        payload: {
          transactionId: dto.transactionId,
          oldProductId: dto.productId,
          oldQuantity: dto.quantity,
          condition: dto.condition,
          reason: dto.reason,
          newProductId: dto.newProductId,
          newQuantity: dto.newQuantity,
          allowStockOverride: dto.allowStockOverride,
          is_within_7_days: isWithinWindow, // Passes into payload so handler can write to Exchange DB
        },
      },
      staffId,
    );

    return {
      message: dto.allowStockOverride
        ? 'Exchange with negative stock override pending manager approval.'
        : 'Exchange requested and pending manager approval.',
      approvalRequestId: approvalRequest.id,
    };
  }
}
