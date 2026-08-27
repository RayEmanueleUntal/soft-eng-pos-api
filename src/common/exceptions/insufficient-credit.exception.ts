import { HttpException, HttpStatus } from '@nestjs/common';

export class InsufficientCreditException extends HttpException {
  constructor(customerId: number, creditBalance: number, amount: number) {
    super(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        error: 'Payment Required',
        message: `The customer '${customerId}' does not have enough credit.`,
        details: {
          customerId,
          amount,
          creditBalance,
        },
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
