import { HttpException, HttpStatus } from '@nestjs/common';

export class PurchaseOrderHasDeliveriesException extends HttpException {
  constructor(poId: number, deliveryCount: number) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: `Cannot cancel Purchase Order ${poId} because ${deliveryCount} delivery/deliveries have already been received against it.`,
        poId,
        deliveryCount,
      },
      HttpStatus.CONFLICT,
    );
  }
}
