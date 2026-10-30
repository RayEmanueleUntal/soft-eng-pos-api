// src/common/exceptions/overdue-credit.exception.ts
import { ForbiddenException } from '@nestjs/common';

export class OverdueCreditException extends ForbiddenException {
  constructor(
    customerId: number,
    overdueCount: number,
    totalOverdueAmount: number,
  ) {
    super(
      `Checkout blocked: Customer #${customerId} has ${overdueCount} overdue invoice(s) ` +
        `totalling ₱${totalOverdueAmount.toFixed(2)}. Override is required to proceed.`,
    );
  }
}
