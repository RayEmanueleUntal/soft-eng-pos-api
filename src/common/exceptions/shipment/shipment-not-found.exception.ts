import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when a requested Shipment record is not found in the database.
 */
export class ShipmentNotFoundException extends HttpException {
  constructor(shipmentId: number) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        message: `Shipment with ID ${shipmentId} was not found. Please check the shipment reference.`,
        details: { shipmentId },
      },
      HttpStatus.NOT_FOUND,
    );
  }
}
