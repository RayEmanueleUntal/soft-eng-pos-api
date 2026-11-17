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
import { RequestType, UnitOfMeasure } from 'src/generated/prisma/enums';
import {
  ExchangeItemPayload,
  RefundItemPayload,
  RefundPaymentBreakdown,
} from './interfaces';

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
      throw new NotFoundException(`Transaction #${transactionId} not found.`);
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

  private async resolveAndValidateRefundItems(
    transactionId: number,
    items: CreateRefundDto['items'],
  ): Promise<{
    resolvedItems: RefundItemPayload[];
    paymentBreakdown: RefundPaymentBreakdown;
  }> {
    // Prevent duplicate productIds in the same payload
    const seenProductIds = new Set<number>();
    for (const item of items) {
      if (seenProductIds.has(item.productId)) {
        throw new BadRequestException(
          `Duplicate Product #${item.productId} found in refund request. Combine quantities into a single line item.`,
        );
      }
      seenProductIds.add(item.productId);
    }

    // Fetch transaction with all items, products, payments, and prior returns
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        transactionItems: {
          include: { product: true },
        },
        payments: {
          include: { creditPayment: true },
        },
        returns: true,
        exchanges: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction #${transactionId} not found.`);
    }

    const resolvedItems: RefundItemPayload[] = [];
    let totalRefundAmount = 0;

    for (const item of items) {
      const txItem = transaction.transactionItems.find(
        (ti) => ti.productId === item.productId,
      );

      if (!txItem) {
        throw new NotFoundException(
          `Product #${item.productId} was not found in Transaction #${transactionId}.`,
        );
      }

      const purchasedUom = txItem.unit_of_measure;
      const baseUom = txItem.product.base_uom;
      const chosenUom = item.unit_of_measure ?? baseUom;

      // Requirement 2: Accepted UOM must be either the purchased UOM or the base UOM
      if (chosenUom !== purchasedUom && chosenUom !== baseUom) {
        throw new BadRequestException(
          `Invalid UOM '${chosenUom}' for Product #${item.productId} (${txItem.product.name}). Allowed UOMs: '${purchasedUom}' (purchased) or '${baseUom}' (base).`,
        );
      }

      const conversionFactor =
        chosenUom === baseUom ? 1 : txItem.uom_conversion_factor.toNumber();
      const baseQuantity = Number(
        (item.quantity * conversionFactor).toFixed(3),
      );

      // Requirement 3: Total returned + exchanged base quantity must not exceed purchased base_quantity_deducted
      const baseQuantityDeducted = txItem.base_quantity_deducted.toNumber();

      const alreadyReturnedBaseQty = transaction.returns
        .filter((r) => r.productId === item.productId)
        .reduce((sum, r) => sum + r.quantity.toNumber(), 0);

      const alreadyExchangedBaseQty = transaction.exchanges
        .filter((e) => e.productId === item.productId)
        .reduce((sum, e) => sum + e.quantity.toNumber(), 0);

      const remainingReturnableBaseQty = Number(
        (
          baseQuantityDeducted -
          alreadyReturnedBaseQty -
          alreadyExchangedBaseQty
        ).toFixed(3),
      );

      if (baseQuantity > remainingReturnableBaseQty) {
        throw new BadRequestException(
          `Refund quantity (${baseQuantity} ${baseUom}) for Product #${item.productId} (${txItem.product.name}) exceeds remaining returnable quantity (${remainingReturnableBaseQty} ${baseUom}).`,
        );
      }

      // Snapshotted effective unit price in base UOM
      const effectiveBaseUnitPrice =
        txItem.subtotal.toNumber() / baseQuantityDeducted;
      const itemRefundAmount = Number(
        (effectiveBaseUnitPrice * baseQuantity).toFixed(2),
      );

      totalRefundAmount = Number(
        (totalRefundAmount + itemRefundAmount).toFixed(2),
      );

      resolvedItems.push({
        productId: item.productId,
        productName: txItem.product.name,
        requestedQuantity: item.quantity,
        unitOfMeasure: chosenUom,
        conversionFactor,
        baseQuantity,
        itemRefundAmount,
        condition: item.condition,
        reason: item.reason,
      });
    }

    // Allocate total refund: wholesale credit debt reduction first, remaining as cash payout
    const creditPayment = transaction.payments.find(
      (p) => p.creditPayment,
    )?.creditPayment;
    const remainingCreditBalance = creditPayment
      ? creditPayment.remaining_credit_balance.toNumber()
      : 0;

    const creditDebtReduction = Number(
      Math.min(remainingCreditBalance, totalRefundAmount).toFixed(2),
    );
    const cashPayoutAmount = Number(
      Math.max(0, totalRefundAmount - creditDebtReduction).toFixed(2),
    );

    const originalPayments = transaction.payments.map((p) => ({
      method: p.payment_method,
      amountPaid: p.amount_paid.toNumber(),
      remainingCreditBalance: p.creditPayment
        ? p.creditPayment.remaining_credit_balance.toNumber()
        : undefined,
    }));

    return {
      resolvedItems,
      paymentBreakdown: {
        totalRefundAmount,
        creditDebtReduction,
        cashPayoutAmount,
        originalPayments,
      },
    };
  }

  async requestRefund(
    dto: CreateRefundDto,
    staffId: number,
  ): Promise<ReturnResponseDto> {
    this.logger.log(
      `Staff #${staffId} initiating Refund request for Tx #${dto.transactionId} (${dto.items.length} item(s))`,
    );

    await this.validateReturnWindow(dto.transactionId);

    const { resolvedItems, paymentBreakdown } =
      await this.resolveAndValidateRefundItems(dto.transactionId, dto.items);

    const approvalRequest = await this.approvalService.createRequest(
      {
        type: RequestType.REFUND_TRANSACTION,
        payload: {
          transactionId: dto.transactionId,
          items: resolvedItems,
          paymentBreakdown,
        },
      },
      staffId,
    );

    return {
      message: 'Refund requested and pending manager approval.',
      approvalRequestId: approvalRequest.id,
    };
  }

  private async resolveAndValidateExchangeItems(
    transactionId: number,
    items: CreateExchangeDto['items'],
  ): Promise<ExchangeItemPayload[]> {
    // Prevent duplicate productIds in the same payload
    const seenProductIds = new Set<number>();
    for (const item of items) {
      if (seenProductIds.has(item.productId)) {
        throw new BadRequestException(
          `Duplicate Product #${item.productId} found in exchange request. Combine quantities into a single line item.`,
        );
      }
      seenProductIds.add(item.productId);
    }

    // Fetch transaction with items, products, prior returns, and prior exchanges
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        transactionItems: {
          include: { product: true },
        },
        returns: true,
        exchanges: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction #${transactionId} not found.`);
    }

    const resolvedItems: ExchangeItemPayload[] = [];

    for (const item of items) {
      const txItem = transaction.transactionItems.find(
        (ti) => ti.productId === item.productId,
      );

      if (!txItem) {
        throw new NotFoundException(
          `Product #${item.productId} was not found in Transaction #${transactionId}.`,
        );
      }

      const purchasedUom = txItem.unit_of_measure;
      const baseUom = txItem.product.base_uom;
      const chosenUom = item.unit_of_measure ?? baseUom;

      // Requirement 2: Accepted UOM must be either the purchased UOM or the base UOM
      if (chosenUom !== purchasedUom && chosenUom !== baseUom) {
        throw new BadRequestException(
          `Invalid UOM '${chosenUom}' for Product #${item.productId} (${txItem.product.name}). Allowed UOMs: '${purchasedUom}' (purchased) or '${baseUom}' (base).`,
        );
      }

      const conversionFactor =
        chosenUom === baseUom ? 1 : txItem.uom_conversion_factor.toNumber();
      const baseQuantity = Number(
        (item.quantity * conversionFactor).toFixed(3),
      );

      // Requirement 3: Total returned + exchanged base quantity must not exceed purchased base_quantity_deducted
      const baseQuantityDeducted = txItem.base_quantity_deducted.toNumber();

      const alreadyReturnedBaseQty = transaction.returns
        .filter((r) => r.productId === item.productId)
        .reduce((sum, r) => sum + r.quantity.toNumber(), 0);

      const alreadyExchangedBaseQty = transaction.exchanges
        .filter((e) => e.productId === item.productId)
        .reduce((sum, e) => sum + e.quantity.toNumber(), 0);

      const remainingEligibleBaseQty = Number(
        (
          baseQuantityDeducted -
          alreadyReturnedBaseQty -
          alreadyExchangedBaseQty
        ).toFixed(3),
      );

      if (baseQuantity > remainingEligibleBaseQty) {
        throw new BadRequestException(
          `Exchange quantity (${baseQuantity} ${baseUom}) for Product #${item.productId} (${txItem.product.name}) exceeds remaining eligible quantity (${remainingEligibleBaseQty} ${baseUom}).`,
        );
      }

      resolvedItems.push({
        productId: item.productId,
        productName: txItem.product.name,
        requestedQuantity: item.quantity,
        unitOfMeasure: chosenUom,
        conversionFactor,
        baseQuantity,
        condition: item.condition,
        reason: item.reason,
      });
    }

    return resolvedItems;
  }

  async requestExchange(
    dto: CreateExchangeDto,
    staffId: number,
  ): Promise<ReturnResponseDto> {
    this.logger.log(
      `Staff #${staffId} initiating Exchange request for Tx #${dto.transactionId} (${dto.items.length} item(s))`,
    );

    // 1. Date Verification
    await this.validateReturnWindow(dto.transactionId);

    // 2. Validate items, UOMs, and cumulative return + exchange limits
    const resolvedItems = await this.resolveAndValidateExchangeItems(
      dto.transactionId,
      dto.items,
    );

    // 3. Create Approval Request
    const approvalRequest = await this.approvalService.createRequest(
      {
        type: RequestType.EXCHANGE_TRANSACTION,
        payload: {
          transactionId: dto.transactionId,
          items: resolvedItems,
          allowStockOverride: dto.allowStockOverride ?? false,
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
