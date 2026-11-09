import { BadRequestException } from '@nestjs/common';

/**
 * Custom exception thrown when invalid analytics date filters are provided.
 */
export class InvalidDateRangeException extends BadRequestException {
  constructor(message = 'startDate cannot be greater than endDate') {
    super({
      statusCode: 400,
      error: 'Bad Request',
      message,
    });
  }
}
