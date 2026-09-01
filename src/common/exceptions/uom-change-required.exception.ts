import { BadRequestException } from '@nestjs/common';
import { UnitOfMeasure } from 'src/generated/prisma/client';

export class UomChangeRequiredException extends BadRequestException {
  constructor(currentUom: UnitOfMeasure, targetUom: UnitOfMeasure) {
    super({
      statusCode: 400,
      error: 'Bad Request',
      code: 'UOM_CHANGE_CONFIRMATION_REQUIRED',
      message: `Modifying base_uom from ${currentUom} to ${targetUom} alters inventory interpretations. Set confirmUomChange=true to confirm this change (product will be flagged for recount).`,
      currentUom,
      targetUom,
    });
  }
}
