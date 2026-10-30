import { HttpException, HttpStatus } from '@nestjs/common';

export class InvalidDeliveryQuantityException extends HttpException {
  constructor(productId: number, message: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: `Invalid delivery quantity for Product #${productId}: ${message}`,
        productId,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
