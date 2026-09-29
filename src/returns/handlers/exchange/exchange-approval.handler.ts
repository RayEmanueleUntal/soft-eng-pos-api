import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ApprovalRegistry } from 'src/approval/approval-registry.service';
import { ApprovalHandler } from 'src/approval/interfaces/approval-handler.interface';
import { Prisma } from 'src/generated/prisma/client';
import { MovementType, RequestType } from 'src/generated/prisma/enums';
import { InventoryService } from 'src/inventory/inventory.service';
import { ItemCondition } from 'src/returns/dto';

export interface ExchangeApprovalPayload {
  transactionId: number;
  oldProductId: number;
  oldQuantity: number;
  condition: ItemCondition;
  reason: string;
  newProductId: number;
  newQuantity: number;
  allowStockOverride: boolean;
}

@Injectable()
export class ExchangeApprovalHandler
  implements ApprovalHandler<ExchangeApprovalPayload>, OnModuleInit
{
  readonly type = RequestType.EXCHANGE_TRANSACTION;
  private readonly logger = new Logger(ExchangeApprovalHandler.name);

  constructor(
    private readonly registry: ApprovalRegistry,
    private readonly inventoryService: InventoryService,
  ) {}

  onModuleInit() {
    this.registry.register(this);
  }

  async execute(
    payload: ExchangeApprovalPayload,
    tx: Prisma.TransactionClient,
    requestedById: number,
  ): Promise<void> {
    this.logger.log(
      `Executing Exchange: Tx #${payload.transactionId} | In: Product #${payload.oldProductId} | Out: Product #${payload.newProductId}`,
    );

    // 1. Calculate Old Item's Refund Value (Effective Pricing)
    const oldTransactionItem = await tx.transactionItem.findFirstOrThrow({
      where: {
        transactionId: payload.transactionId,
        productId: payload.oldProductId,
      },
      include: { product: true },
    });

    const oldTotalBaseUnitsSold =
      oldTransactionItem.quantity_sold.toNumber() *
      oldTransactionItem.product.pricing_unit_qty.toNumber();
    const oldEffectiveBaseUnitPrice =
      oldTransactionItem.subtotal.toNumber() / oldTotalBaseUnitsSold;
    const oldItemValue = oldEffectiveBaseUnitPrice * payload.oldQuantity;

    // 2. Fetch New Item & Calculate Difference
    const newProduct = await tx.product.findUniqueOrThrow({
      where: { id: payload.newProductId },
    });
    const newItemValue =
      newProduct.retail_price.toNumber() *
      (payload.newQuantity / newProduct.pricing_unit_qty.toNumber());
    const priceDifference = new Prisma.Decimal(newItemValue - oldItemValue); // Positive = Customer owes us. Negative = We owe customer.

    // 3. Process the Old Item Return
    await tx.return.create({
      data: {
        transactionId: payload.transactionId,
        productId: payload.oldProductId,
        quantity: payload.oldQuantity,
        defect_reason: payload.reason,
        refund_amount: oldItemValue,
        staffId: requestedById,
      },
    });

    // 4. Process the Exchange Record
    await tx.exchange.create({
      data: {
        transactionId: payload.transactionId,
        productId: payload.newProductId,
        quantity: payload.newQuantity,
        price_difference: priceDifference,
        is_within_7_days: true, // Assuming validation handled in service
      },
    });

    // 5. Inventory: Reduce stock for the New Item (Using your existing inventory method)
    await this.inventoryService.reduceProductStock(tx, {
      productId: payload.newProductId,
      quantityToDeduct: payload.newQuantity,
      provided_uom: newProduct.base_uom,
      userId: requestedById,
      reason: `EXCHANGE ISSUED for Tx #${payload.transactionId}`,
      allowOverride: payload.allowStockOverride,
      operation_name: 'EXCHANGE',
    });

    // 6. Restock Old Item if not defective
    if (payload.condition === ItemCondition.CHANGE_OF_MIND) {
      const oldProduct = await tx.product.findUniqueOrThrow({
        where: { id: payload.oldProductId },
      });

      await this.inventoryService.restockProductStock(tx, {
        productId: payload.oldProductId,
        quantityToAdd: payload.oldQuantity,
        provided_uom: oldProduct.base_uom,
        userId: requestedById,
        reason: `EXCHANGE RESTOCK: Returned in sellable condition (Tx #${payload.transactionId})`,
        operation_name: 'EXCHANGE_RESTOCK',
      });
    } else {
      this.logger.warn(
        `Returned product #${payload.oldProductId} was marked ${payload.condition}. Skipping restock into sellable inventory.`,
      );
    }
  }
}
