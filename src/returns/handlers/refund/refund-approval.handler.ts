import {
  Injectable,
  Logger,
  OnModuleInit,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalRegistry } from 'src/approval/approval-registry.service';
import { ApprovalHandler } from 'src/approval/interfaces/approval-handler.interface';
import { Prisma } from 'src/generated/prisma/client';
import { RequestType } from 'src/generated/prisma/enums';
import { InventoryService } from 'src/inventory/inventory.service';
import { RefundApprovalPayload } from 'src/returns/interfaces';
import { ItemCondition } from 'src/returns/dto';

@Injectable()
export class RefundApprovalHandler
  implements ApprovalHandler<RefundApprovalPayload>, OnModuleInit
{
  readonly type = RequestType.REFUND_TRANSACTION;
  private readonly logger = new Logger(RefundApprovalHandler.name);

  constructor(
    private readonly registry: ApprovalRegistry,
    private readonly inventoryService: InventoryService,
  ) {}

  onModuleInit() {
    this.registry.register(this);
  }

  async execute(
    payload: RefundApprovalPayload,
    tx: Prisma.TransactionClient,
    requestedById: number,
  ): Promise<void> {
    const {
      transactionId,
      productId,
      quantity,
      condition,
      reason,
      paymentBreakdown,
    } = payload;

    this.logger.log(
      `Executing Refund for Tx #${transactionId} | Debt Reduction: ₱${paymentBreakdown.creditDebtReduction} | Cash Payout: ₱${paymentBreakdown.cashPayoutAmount}`,
    );

    const transactionItem = await tx.transactionItem.findFirst({
      where: { transactionId, productId },
      include: {
        product: true,
        transaction: {
          include: { payments: { include: { creditPayment: true } } },
        },
      },
    });

    if (!transactionItem) {
      throw new NotFoundException(`Transaction item not found`);
    }

    // 1. Record Return
    await tx.return.create({
      data: {
        transactionId,
        productId,
        quantity: new Prisma.Decimal(quantity),
        defect_reason: reason,
        refund_amount: new Prisma.Decimal(paymentBreakdown.totalRefundAmount),
        staffId: requestedById,
      },
    });

    // 2. Restock product if sellable
    if (condition === ItemCondition.CHANGE_OF_MIND) {
      await this.inventoryService.restockProductStock(tx, {
        productId,
        quantityToAdd: quantity,
        provided_uom: transactionItem.product.base_uom,
        userId: requestedById,
        reason: `RETURN RESTOCK: ${reason} (Tx #${transactionId})`,
        operation_name: 'REFUND_RESTOCK',
      });
    }

    // 3. Deduct from Credit Balance if applicable
    const creditPayment = transactionItem.transaction.payments.find(
      (p) => p.creditPayment,
    )?.creditPayment;

    if (creditPayment && paymentBreakdown.creditDebtReduction > 0) {
      await tx.creditPayment.update({
        where: { paymentId: creditPayment.paymentId },
        data: {
          remaining_credit_balance: {
            decrement: paymentBreakdown.creditDebtReduction,
          },
        },
      });

      if (transactionItem.transaction.customerId) {
        await tx.wholeSaleCustomer.update({
          where: { customerId: transactionItem.transaction.customerId },
          data: {
            outstanding_balance: {
              decrement: paymentBreakdown.creditDebtReduction,
            },
          },
        });
      }

      this.logger.log(
        `Successfully reduced debt balance by ₱${paymentBreakdown.creditDebtReduction}`,
      );
    }
  }
}
