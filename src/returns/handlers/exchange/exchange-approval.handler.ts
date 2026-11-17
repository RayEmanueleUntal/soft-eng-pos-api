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
import { ItemCondition, RequestType } from 'src/generated/prisma/enums';
import { InventoryService } from 'src/inventory/inventory.service';
import { ExchangeApprovalPayload } from 'src/returns/interfaces';

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
    const { transactionId, items, allowStockOverride } = payload;

    this.logger.log(
      `Executing Exchange for Tx #${transactionId} (${items.length} item(s))`,
    );

    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId },
      include: {
        transactionItems: { include: { product: true } },
        returns: true,
        exchanges: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction #${transactionId} not found.`);
    }

    // Track cumulative (returns + exchanges) in-memory across the loop
    const usedQtyByProduct = new Map<number, number>();
    for (const r of transaction.returns) {
      usedQtyByProduct.set(
        r.productId,
        (usedQtyByProduct.get(r.productId) ?? 0) + r.quantity.toNumber(),
      );
    }
    for (const e of transaction.exchanges) {
      usedQtyByProduct.set(
        e.productId,
        (usedQtyByProduct.get(e.productId) ?? 0) + e.quantity.toNumber(),
      );
    }

    for (const item of items) {
      const txItem = transaction.transactionItems.find(
        (ti) => ti.productId === item.productId,
      );

      if (!txItem) {
        throw new NotFoundException(
          `Product #${item.productId} not found in Transaction #${transactionId}.`,
        );
      }

      // Concurrency-safe re-check against over-returning/exchanging
      const baseQuantityDeducted = txItem.base_quantity_deducted.toNumber();
      const alreadyUsedBaseQty = usedQtyByProduct.get(item.productId) ?? 0;

      if (alreadyUsedBaseQty + item.baseQuantity > baseQuantityDeducted) {
        throw new BadRequestException(
          `Cannot approve exchange: ${item.baseQuantity} ${txItem.product.base_uom} for Product #${item.productId} exceeds remaining eligible quantity (${baseQuantityDeducted - alreadyUsedBaseQty}).`,
        );
      }

      usedQtyByProduct.set(
        item.productId,
        alreadyUsedBaseQty + item.baseQuantity,
      );

      // 1. Record the Exchange (1-to-1 same-product replacement in Base UOM)
      await tx.exchange.create({
        data: {
          transactionId,
          productId: item.productId,
          quantity: new Prisma.Decimal(item.baseQuantity),
          staffId: requestedById,
        },
      });

      // 2. Inventory: Deduct replacement stock issued to customer (in Base UOM)
      await this.inventoryService.reduceProductStock(tx, {
        productId: item.productId,
        quantityToDeduct: item.baseQuantity,
        provided_uom: txItem.product.base_uom,
        userId: requestedById,
        reason: `EXCHANGE ISSUED: ${item.reason} (Tx #${transactionId})`,
        allowOverride: allowStockOverride,
        operation_name: 'EXCHANGE',
      });

      // 3. Inventory: Restock returned unit ONLY if in sellable condition
      if (item.condition === ItemCondition.CHANGE_OF_MIND) {
        await this.inventoryService.restockProductStock(tx, {
          productId: item.productId,
          quantityToAdd: item.baseQuantity,
          provided_uom: txItem.product.base_uom,
          userId: requestedById,
          reason: `EXCHANGE RESTOCK: Returned in sellable condition (Tx #${transactionId})`,
          operation_name: 'EXCHANGE_RESTOCK',
        });
      } else {
        this.logger.warn(
          `Returned product #${item.productId} was marked ${item.condition}. Skipping restock into sellable inventory.`,
        );
      }
    }
  }
}
