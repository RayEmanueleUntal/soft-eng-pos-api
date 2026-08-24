import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import * as CacheManager from 'cache-manager';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: CacheManager.Cache,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // 1. Extract Idempotency Key
    const idempotencyKey = request.headers['idempotency-key'];
    if (!idempotencyKey) {
      throw new BadRequestException('Header Idempotency-Key is required.');
    }

    const cacheKey = `idempotency:${idempotencyKey}`;
    const cachedRecord = await this.cacheManager.get<{
      status: number;
      body: any;
    }>(cacheKey);

    // 2. Handle duplicate request
    if (cachedRecord) {
      if (cachedRecord.body === 'IN_PROGRESS') {
        throw new ConflictException(
          'A request with this key is currently processing.',
        );
      }

      // Serve cached result directly
      response.status(cachedRecord.status);
      return of(cachedRecord.body);
    }

    // 3. Lock key to prevent concurrent processing (24 hour TTL)
    const TTL_MS = 86_400_000; // 24 hours in milliseconds
    await this.cacheManager.set(
      cacheKey,
      { status: 102, body: 'IN_PROGRESS' },
      TTL_MS,
    );

    // 4. Execute route handler and cache outcome
    return next.handle().pipe(
      tap({
        next: async (body) => {
          await this.cacheManager.set(
            cacheKey,
            { status: response.statusCode, body },
            TTL_MS,
          );
        },
        error: async () => {
          // Clear lock on failure so the client can safely retry
          await this.cacheManager.del(cacheKey);
        },
      }),
    );
  }
}
