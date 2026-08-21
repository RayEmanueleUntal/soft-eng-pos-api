import { HttpException, HttpStatus } from '@nestjs/common';

export class OutOfStockException extends HttpException {
  constructor(productId: number, productName: string) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: `The product '${productName}' is out of stock`,
        details: {
          productId,
          productName,
        },
      },
      HttpStatus.CONFLICT,
    );
  }
}
