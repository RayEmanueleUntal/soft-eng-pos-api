import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ApprovalRegistry } from 'src/approval/approval-registry.service';
import { ApprovalHandler } from 'src/approval/interfaces/approval-handler.interface';
import { Prisma } from 'src/generated/prisma/client';
import { MovementType, RequestType } from 'src/generated/prisma/enums';
import { InventoryService } from 'src/inventory/inventory.service';
import { ItemCondition } from 'src/returns/dto';

export interface RefundApprovalPayload {
  transactionId: number;
  productId: number;
  quantity: number; // In Base UOM
  condition: ItemCondition;
  reason: string;
}

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
    this.logger.log(
      `Executing Refund for Transaction #${payload.transactionId}, Product #${payload.productId}`,
    );

    // 1. Fetch Original Transaction Item (to calculate effective price)
    const transactionItem = await tx.transactionItem.findFirst({
      where: {
        transactionId: payload.transactionId,
        productId: payload.productId,
      },
      include: {
        product: true,
        transaction: {
          include: { payments: { include: { creditPayment: true } } },
        },
      },
    });

    if (!transactionItem) throw new Error('Transaction item not found');

    // 2. Calculate Effective Net Price (Handles Wholesale & Discounts)
    const totalBaseUnitsSold =
      transactionItem.quantity_sold.toNumber() *
      transactionItem.product.pricing_unit_qty.toNumber();
    const effectiveBaseUnitPrice =
      transactionItem.subtotal.toNumber() / totalBaseUnitsSold;
    const refundAmount = new Prisma.Decimal(
      effectiveBaseUnitPrice * payload.quantity,
    );

    // 3. Create Return Record
    await tx.return.create({
      data: {
        transactionId: payload.transactionId,
        productId: payload.productId,
        quantity: payload.quantity,
        defect_reason: payload.reason,
        refund_amount: refundAmount,
        staffId: requestedById,
      },
    });

    // 4. Handle Inventory Restock (Only if NOT defective)
    if (payload.condition === ItemCondition.CHANGE_OF_MIND) {
      const product = await tx.product.findUniqueOrThrow({
        where: { id: payload.productId },
      });

      await this.inventoryService.restockProductStock(tx, {
        productId: payload.productId,
        quantityToAdd: payload.quantity,
        provided_uom: product.base_uom,
        userId: requestedById,
        reason: `RETURN RESTOCK: ${payload.reason} (Tx #${payload.transactionId})`,
        operation_name: 'REFUND_RESTOCK',
      });
    } else {
      this.logger.warn(
        `Product #${payload.productId} returned as ${payload.condition}. Skipping inventory restock.`,
      );
    }

    // 5. Handle Wholesale Credit Payments (Debt Reduction)
    const creditPayment = transactionItem.transaction.payments.find(
      (p) => p.creditPayment,
    )?.creditPayment;
    if (creditPayment && transactionItem.transaction.customerId) {
      // Reduce invoice debt
      const remainingBalance =
        creditPayment.remaining_credit_balance.toNumber();
      const debtReduction = Math.min(remainingBalance, refundAmount.toNumber());

      if (debtReduction > 0) {
        await tx.creditPayment.update({
          where: { paymentId: creditPayment.paymentId },
          data: { remaining_credit_balance: { decrement: debtReduction } },
        });

        // Restore wholesale credit limit
        await tx.wholeSaleCustomer.update({
          where: { customerId: transactionItem.transaction.customerId },
          data: { outstanding_balance: { decrement: debtReduction } },
        });

        this.logger.log(
          `Refunded ${debtReduction} to wholesale credit balance.`,
        );
      }
    }
  }
}
