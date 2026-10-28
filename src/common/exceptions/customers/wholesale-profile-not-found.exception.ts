import { NotFoundException } from '@nestjs/common';

export class WholesaleProfileNotFoundException extends NotFoundException {
  constructor(customerId: number) {
    super(
      `Wholesale profile for Customer #${customerId} was not found or customer is not a wholesale account.`,
    );
  }
}
