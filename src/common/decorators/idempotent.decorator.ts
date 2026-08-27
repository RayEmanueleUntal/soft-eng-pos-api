import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { IdempotencyInterceptor } from '../interceptors';
import { ApiBadRequestResponse, ApiHeader } from '@nestjs/swagger';

export function Idempotent() {
  return applyDecorators(
    UseInterceptors(IdempotencyInterceptor),
    ApiHeader({
      name: 'Idempotency-Key',
      description:
        'Unique identifier to prevent duplicate processing on retries',
      required: true,
      schema: { type: 'string' },
    }),
    ApiBadRequestResponse({
      description: 'Missing or invalid Idempotency-Key header',
    }),
  );
}
