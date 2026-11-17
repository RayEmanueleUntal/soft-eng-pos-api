import { BadRequestException } from '@nestjs/common';
import { UnitOfMeasure } from 'src/generated/prisma/enums';

export class DuplicatePOProductUomException extends BadRequestException {
  constructor(
    productId: number,
    existingUom: UnitOfMeasure,
    conflictingUom: UnitOfMeasure,
  ) {
    super({
      statusCode: 400,
      error: 'Bad Request',
      message: `Product ID ${productId} cannot be added multiple times with different units of measure (${existingUom} and ${conflictingUom}) in the same Purchase Order. Please use a single UoM per product.`,
      productId,
      existingUom,
      conflictingUom,
    });
  }
}
