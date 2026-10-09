import { HttpException, HttpStatus } from '@nestjs/common';

export class PurchaseOrderNotFoundException extends HttpException {
  constructor(poId: number) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        message: `Purchase Order with ID ${poId} was not found.`,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}
