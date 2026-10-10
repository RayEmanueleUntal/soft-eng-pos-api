import { HttpException, HttpStatus } from '@nestjs/common';

export class InvalidPOStatusException extends HttpException {
  constructor(poId: number, status: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: `Purchase Order #${poId} is in status '${status}' and cannot accept deliveries.`,
        details: { poId, status },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
