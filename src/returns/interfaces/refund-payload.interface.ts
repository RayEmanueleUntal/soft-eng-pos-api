import {
  ItemCondition,
  PaymentMethod,
  UnitOfMeasure,
} from 'src/generated/prisma/enums';

export interface RefundItemPayload {
  productId: number;
  productName: string;
  requestedQuantity: number;
  unitOfMeasure: UnitOfMeasure;
  conversionFactor: number;
  baseQuantity: number; // Always in product's base_uom
  itemRefundAmount: number;
  condition: ItemCondition;
  reason: string;
}

export interface RefundPaymentBreakdown {
  totalRefundAmount: number;
  creditDebtReduction: number;
  cashPayoutAmount: number;
  originalPayments: {
    method: PaymentMethod;
    amountPaid: number;
    remainingCreditBalance?: number;
  }[];
}

export interface RefundApprovalPayload {
  transactionId: number;
  items: RefundItemPayload[];
  paymentBreakdown: RefundPaymentBreakdown;
}
