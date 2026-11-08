import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when an expense amount is invalid (e.g. non-positive or zero).
 */
export class InvalidExpenseAmountException extends HttpException {
  constructor(amount: number) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: `Invalid expense amount: ${amount}. Amount must be greater than zero.`,
        details: { amount },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
