import { HttpException, HttpStatus } from '@nestjs/common';

export class PurchaseOrderImmutableException extends HttpException {
  constructor(poId: number, status: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: `Purchase Order ${poId} cannot be modified because its current status is '${status}'.`,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
