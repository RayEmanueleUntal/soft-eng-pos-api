import { BadRequestException } from '@nestjs/common';
import { UnitOfMeasure } from 'src/generated/prisma/enums';

export class UOMMismatchException extends BadRequestException {
  constructor(
    productName: string,
    providedUom: UnitOfMeasure,
    validUoms: UnitOfMeasure[],
  ) {
    super(
      `Invalid UOM '${providedUom}' for product '${productName}'. Valid UOMs are: ${validUoms.join(
        ', ',
      )}.`,
    );
  }
}
