import {
  Injectable,
  Logger,
  OnModuleInit,
  NotFoundException,
  BadRequestException,
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
    const { transactionId, items, paymentBreakdown } = payload;

    this.logger.log(
      `Executing Refund for Tx #${transactionId} (${items.length} item(s)) | Debt Reduction: ₱${paymentBreakdown.creditDebtReduction} | Cash Payout: ₱${paymentBreakdown.cashPayoutAmount}`,
    );

    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId },
      include: {
        transactionItems: { include: { product: true } },
        payments: { include: { creditPayment: true } },
        returns: true,
        exchanges: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction #${transactionId} not found.`);
    }

    // Track cumulative (returns + exchanges) in-memory across the loop
    const usedQtyByProduct = new Map<number, number>();
    for (const existingReturn of transaction.returns) {
      const current = usedQtyByProduct.get(existingReturn.productId) ?? 0;
      usedQtyByProduct.set(
        existingReturn.productId,
        current + existingReturn.quantity.toNumber(),
      );
    }
    for (const existingExchange of transaction.exchanges) {
      const current = usedQtyByProduct.get(existingExchange.productId) ?? 0;
      usedQtyByProduct.set(
        existingExchange.productId,
        current + existingExchange.quantity.toNumber(),
      );
    }

    for (const item of items) {
      const matchingTxItems = transaction.transactionItems.filter(
        (ti) => ti.productId === item.productId,
      );

      if (matchingTxItems.length === 0) {
        throw new NotFoundException(
          `Product #${item.productId} not found in Transaction #${transactionId}.`,
        );
      }

      const baseUom = matchingTxItems[0].product.base_uom;

      // Concurrency-safe re-check across all line items of this product in the transaction
      const baseQuantityDeducted = matchingTxItems.reduce(
        (sum, ti) => sum + ti.base_quantity_deducted.toNumber(),
        0,
      );
      const alreadyUsedBaseQty = usedQtyByProduct.get(item.productId) ?? 0;

      if (
        Number((alreadyUsedBaseQty + item.baseQuantity).toFixed(3)) >
        Number(baseQuantityDeducted.toFixed(3))
      ) {
        throw new BadRequestException(
          `Cannot approve refund: ${item.baseQuantity} ${baseUom} for Product #${item.productId} exceeds remaining eligible quantity (${Number((baseQuantityDeducted - alreadyUsedBaseQty).toFixed(3))}).`,
        );
      }

      usedQtyByProduct.set(
        item.productId,
        Number((alreadyUsedBaseQty + item.baseQuantity).toFixed(3)),
      );

      // 1. Record Return (stored in Base UOM with condition)
      await tx.return.create({
        data: {
          transactionId,
          productId: item.productId,
          quantity: new Prisma.Decimal(item.baseQuantity),
          condition: item.condition,
          defect_reason: item.reason,
          refund_amount: new Prisma.Decimal(item.itemRefundAmount),
          staffId: requestedById,
        },
      });

      // 2. Restock product only if sellable
      if (item.condition === ItemCondition.CHANGE_OF_MIND) {
        await this.inventoryService.restockProductStock(tx, {
          productId: item.productId,
          quantityToAdd: item.baseQuantity,
          provided_uom: baseUom,
          userId: requestedById,
          reason: `RETURN RESTOCK: ${item.reason} (Tx #${transactionId})`,
          operation_name: 'REFUND_RESTOCK',
        });
      }
    }

    // 3. Deduct from Credit Balance if applicable (clamped so balances never go negative)
    const creditPayment = transaction.payments.find(
      (p) => p.creditPayment,
    )?.creditPayment;

    if (creditPayment && paymentBreakdown.creditDebtReduction > 0) {
      const liveRemainingCredit =
        creditPayment.remaining_credit_balance.toNumber();
      const actualDebtReduction = Number(
        Math.min(
          liveRemainingCredit,
          paymentBreakdown.creditDebtReduction,
        ).toFixed(2),
      );

      if (actualDebtReduction > 0) {
        await tx.creditPayment.update({
          where: { paymentId: creditPayment.paymentId },
          data: {
            remaining_credit_balance: {
              decrement: actualDebtReduction,
            },
          },
        });

        if (transaction.customerId) {
          const wholesaleProfile = await tx.wholeSaleCustomer.findUnique({
            where: { customerId: transaction.customerId },
          });

          if (wholesaleProfile) {
            const safeProfileDecrement = Math.min(
              wholesaleProfile.outstanding_balance.toNumber(),
              actualDebtReduction,
            );
            if (safeProfileDecrement > 0) {
              await tx.wholeSaleCustomer.update({
                where: { customerId: transaction.customerId },
                data: {
                  outstanding_balance: {
                    decrement: safeProfileDecrement,
                  },
                },
              });
            }
          }
        }

        this.logger.log(
          `Successfully reduced debt balance by ₱${actualDebtReduction}`,
        );
      }
    }

    // 4. Update Transaction Status (REFUNDED if all purchased items are returned/exchanged, else PARTIALLY_REFUNDED)
    const purchasedBaseByProduct = new Map<number, number>();
    for (const ti of transaction.transactionItems) {
      const current = purchasedBaseByProduct.get(ti.productId) ?? 0;
      purchasedBaseByProduct.set(
        ti.productId,
        Number((current + ti.base_quantity_deducted.toNumber()).toFixed(3)),
      );
    }

    const isFullyResolved = Array.from(purchasedBaseByProduct.entries()).every(
      ([productId, totalPurchasedBase]) => {
        const totalUsed = usedQtyByProduct.get(productId) ?? 0;
        return totalUsed >= totalPurchasedBase;
      },
    );

    await tx.transaction.update({
      where: { id: transactionId },
      data: {
        status: isFullyResolved ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      },
    });
  }
}
