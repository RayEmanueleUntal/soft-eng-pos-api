import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when a settlement payment amount is invalid
 * (e.g., negative, zero, or exceeding current outstanding balance).
 */
export class InvalidPaymentAmountException extends HttpException {
  constructor(
    reason: string,
    details?: { amount_paid?: number; outstanding_balance?: number },
  ) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: `Invalid payment amount: ${reason}`,
        ...(details && { details }),
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
