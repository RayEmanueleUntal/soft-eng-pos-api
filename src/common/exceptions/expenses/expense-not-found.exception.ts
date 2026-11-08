import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when an expense record is not found in the database.
 */
export class ExpenseNotFoundException extends HttpException {
  constructor(expenseId: number) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        message: `Expense record with ID ${expenseId} was not found.`,
        details: { expenseId },
      },
      HttpStatus.NOT_FOUND,
    );
  }
}
