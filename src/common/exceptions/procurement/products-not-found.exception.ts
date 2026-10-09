import { HttpException, HttpStatus } from '@nestjs/common';

export class ProductsNotFoundException extends HttpException {
  constructor(missingProductIds: number[]) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: `The following product IDs do not exist: ${missingProductIds.join(', ')}`,
        missingProductIds,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
