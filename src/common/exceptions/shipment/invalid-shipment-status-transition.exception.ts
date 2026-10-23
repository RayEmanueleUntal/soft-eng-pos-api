import { HttpException, HttpStatus } from '@nestjs/common';
import { TrackingStatus } from 'src/generated/prisma/client';

/**
 * Exception thrown when an illegal tracking status transition is attempted (e.g., PENDING directly to DELIVERED).
 */
export class InvalidShipmentStatusTransitionException extends HttpException {
  constructor(currentStatus: TrackingStatus, targetStatus: TrackingStatus) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: `Invalid status change from '${currentStatus}' to '${targetStatus}'. Allowed flow: PENDING -> DISPATCHED -> DELIVERED.`,
        details: { currentStatus, targetStatus },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
