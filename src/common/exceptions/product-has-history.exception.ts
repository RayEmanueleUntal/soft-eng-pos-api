import { ConflictException } from '@nestjs/common';

export class ProductHasHistoryException extends ConflictException {
  constructor(productId: number, historyCounts: Record<string, number>) {
    super({
      statusCode: 409,
      error: 'Conflict',
      code: 'PRODUCT_HAS_TRANSACTION_HISTORY',
      message: `Cannot hard-delete Product #${productId} because linked history records exist (${Object.entries(
        historyCounts,
      )
        .filter(([, count]) => count > 0)
        .map(([key, count]) => `${count} ${key}`)
        .join(', ')}). Consider archiving or zeroing stock instead.`,
      historyCounts,
    });
  }
}
