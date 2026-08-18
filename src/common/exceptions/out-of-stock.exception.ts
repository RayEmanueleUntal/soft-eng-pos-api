import { HttpException, HttpStatus } from '@nestjs/common';

export class OutOfStockException extends HttpException {
  constructor(productName: string) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: `The product '${productName}' is out of stock`,
      },
      HttpStatus.CONFLICT,
    );
  }
}
