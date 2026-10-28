import { BadRequestException } from '@nestjs/common';

export class InvalidUomConversionException extends BadRequestException {
  constructor(productId: number, conversionFactor: number) {
    super(
      `Invalid UoM conversion factor (${conversionFactor}) for product ID ${productId}. Multiplier must be greater than 0.`,
    );
  }
}
