import { ConflictException } from '@nestjs/common';

/**
 * Thrown when attempting to register or update a Forwarder with a duplicate company name.
 */
export class ForwarderAlreadyExistsException extends ConflictException {
  constructor(companyName: string) {
    super(`Forwarder with company name '${companyName}' already exists.`);
  }
}
