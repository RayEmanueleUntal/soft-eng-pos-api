import { ConflictException } from '@nestjs/common';

export interface ExistingCustomerSummary {
  id: number;
  name: string;
  contact_number: string;
  type: string;
}

export class DuplicateCustomerException extends ConflictException {
  constructor(existingCustomer: ExistingCustomerSummary) {
    super({
      statusCode: 409,
      error: 'Conflict',
      code: 'DUPLICATE_CUSTOMER_CONTACT',
      message: `A customer named "${existingCustomer.name}" is already registered with contact number ${existingCustomer.contact_number}.`,
      existingCustomer,
    });
  }
}
