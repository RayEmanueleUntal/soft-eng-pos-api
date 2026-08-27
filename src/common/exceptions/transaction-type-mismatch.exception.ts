import { BadRequestException } from '@nestjs/common';

export class TransactionTypeMismatchException extends BadRequestException {
  constructor(message?: string) {
    super(
      message ||
        'The transaction type does not match the types of the items included.',
    );
  }
}
