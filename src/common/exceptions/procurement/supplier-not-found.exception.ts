import { HttpException, HttpStatus } from '@nestjs/common';

export class SupplierNotFoundException extends HttpException {
  constructor(supplierId: number) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        message: `Supplier with ID ${supplierId} was not found.`,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}
