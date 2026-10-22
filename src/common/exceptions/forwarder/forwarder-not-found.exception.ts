import { NotFoundException } from '@nestjs/common';

/**
 * Thrown when a requested Forwarder record cannot be found by ID.
 */
export class ForwarderNotFoundException extends NotFoundException {
  constructor(id: number) {
    super(`Forwarder with ID #${id} was not found.`);
  }
}
