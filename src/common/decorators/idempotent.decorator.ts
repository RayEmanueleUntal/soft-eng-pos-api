import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { IdempotencyInterceptor } from '../interceptors';

export function Idempotent() {
  return applyDecorators(UseInterceptors(IdempotencyInterceptor));
}
