import { HttpException, HttpStatus } from '@nestjs/common';

export class POItemNotFoundException extends HttpException {
  constructor(poId: number, productId: number) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: `Product ID ${productId} is not part of Purchase Order #${poId}.`,
        details: { poId, productId },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
