import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when attempting to create an active shipment for a transaction that already has one.
 */
export class DuplicateShipmentException extends HttpException {
  constructor(transactionId: number) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: `An active shipment already exists for Transaction ID ${transactionId}. Complete or cancel existing shipment first.`,
        details: { transactionId },
      },
      HttpStatus.CONFLICT,
    );
  }
}
