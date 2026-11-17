import { BadRequestException } from '@nestjs/common';

export class PurchaseOrderNoDeliveriesException extends BadRequestException {
  constructor(poId: number, targetStatus: string) {
    super({
      statusCode: 400,
      error: 'Bad Request',
      message: `Cannot mark Purchase Order #${poId} as '${targetStatus}' because no deliveries have been recorded against it.`,
      poId,
      targetStatus,
    });
  }
}
