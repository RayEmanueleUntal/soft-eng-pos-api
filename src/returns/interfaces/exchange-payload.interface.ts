import { ItemCondition, UnitOfMeasure } from 'src/generated/prisma/enums';

export interface ExchangeItemPayload {
  productId: number;
  productName: string;
  requestedQuantity: number;
  unitOfMeasure: UnitOfMeasure;
  conversionFactor: number;
  baseQuantity: number; // Always in product's base_uom
  condition: ItemCondition;
  reason: string;
}

export interface ExchangeApprovalPayload {
  transactionId: number;
  items: ExchangeItemPayload[];
  allowStockOverride: boolean;
}
