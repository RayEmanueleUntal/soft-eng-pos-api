import { HttpException, HttpStatus } from '@nestjs/common';

export class InactiveSupplierException extends HttpException {
  constructor(supplierName: string, supplierId: number) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: `Supplier '${supplierName}' (ID: ${supplierId}) is inactive and cannot receive new purchase orders.`,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
