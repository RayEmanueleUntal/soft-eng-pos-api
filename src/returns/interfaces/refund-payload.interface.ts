import { PaymentMethod } from 'src/generated/prisma/enums';
import { ItemCondition } from '../dto';

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
  productId: number;
  quantity: number; // in Base UOM
  condition: ItemCondition;
  reason: string;
  paymentBreakdown: RefundPaymentBreakdown; // Exposed directly to approving Admin/Manager
}
