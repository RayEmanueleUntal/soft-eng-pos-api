import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ApprovalRegistry } from 'src/approval/approval-registry.service';
import { ApprovalHandler } from 'src/approval/interfaces/approval-handler.interface';
import { Prisma } from 'src/generated/prisma/client';
import { RequestType } from 'src/generated/prisma/enums';
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
  is_within_7_days?: boolean;
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

    // 1. Fetch Old Transaction Item & Calculate Refund Value using Snapshotted Pricing
    const oldTransactionItem = await tx.transactionItem.findFirst({
      where: {
        transactionId: payload.transactionId,
        productId: payload.oldProductId,
      },
      include: { product: true },
    });

    if (!oldTransactionItem) {
      throw new NotFoundException(
        `Transaction item not found for Transaction #${payload.transactionId} and Product #${payload.oldProductId}`,
      );
    }

    const oldBaseQuantityDeducted =
      oldTransactionItem.base_quantity_deducted.toNumber();

    if (oldBaseQuantityDeducted <= 0) {
      throw new BadRequestException(
        `Invalid transaction item base quantity deducted (${oldBaseQuantityDeducted}).`,
      );
    }

    // Effective price per base unit = subtotal / base_quantity_deducted
    const oldEffectiveBaseUnitPrice =
      oldTransactionItem.subtotal.toNumber() / oldBaseQuantityDeducted;
    const oldItemValue = oldEffectiveBaseUnitPrice * payload.oldQuantity;

    // 2. Fetch New Item & Calculate Difference (newQuantity is in Base UOM)
    const newProduct = await tx.product.findUnique({
      where: { id: payload.newProductId },
    });

    if (!newProduct) {
      throw new NotFoundException(`Product #${payload.newProductId} not found`);
    }

    const newItemValue =
      newProduct.retail_price.toNumber() * payload.newQuantity;
    const priceDifference = new Prisma.Decimal(newItemValue - oldItemValue);

    // 3. Process the Old Item Return
    await tx.return.create({
      data: {
        transactionId: payload.transactionId,
        productId: payload.oldProductId,
        quantity: new Prisma.Decimal(payload.oldQuantity),
        defect_reason: payload.reason,
        refund_amount: new Prisma.Decimal(oldItemValue),
        staffId: requestedById,
      },
    });

    // 4. Process the Exchange Record
    await tx.exchange.create({
      data: {
        transactionId: payload.transactionId,
        productId: payload.newProductId,
        quantity: new Prisma.Decimal(payload.newQuantity),
        price_difference: priceDifference,
        is_within_7_days: payload.is_within_7_days ?? true,
      },
    });

    // 5. Inventory: Reduce stock for New Item
    await this.inventoryService.reduceProductStock(tx, {
      productId: payload.newProductId,
      quantityToDeduct: payload.newQuantity,
      provided_uom: newProduct.base_uom,
      userId: requestedById,
      reason: `EXCHANGE ISSUED for Tx #${payload.transactionId}`,
      allowOverride: payload.allowStockOverride,
      operation_name: 'EXCHANGE',
    });

    // 6. Restock Old Item via InventoryService.restockProductStock if not defective
    if (payload.condition === ItemCondition.CHANGE_OF_MIND) {
      await this.inventoryService.restockProductStock(tx, {
        productId: payload.oldProductId,
        quantityToAdd: payload.oldQuantity,
        provided_uom: oldTransactionItem.product.base_uom,
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
