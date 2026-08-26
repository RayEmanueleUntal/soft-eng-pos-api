import { HttpException, HttpStatus } from '@nestjs/common';

export class UOMMismatchException extends HttpException {
  constructor(productName: string, productUom: string) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: `Unit of Measure Mismatch. '${productName}' must be counted by '${productUom}'`,
      },
      HttpStatus.CONFLICT,
    );
  }
}
