import { BadRequestException } from '@nestjs/common';

export class InsufficientStockException extends BadRequestException {
  constructor(
    public readonly productId: number,
    public readonly productName: string,
    public readonly requestedQuantity: number,
    public readonly availableQuantity: number,
  ) {
    super({
      statusCode: 400,
      error: 'INSUFFICIENT_STOCK',
      message: `Insufficient stock for product "${productName}". Requested: ${requestedQuantity}, Available: ${availableQuantity}`,
      productId,
      productName,
      requestedQuantity,
      availableQuantity,
    });
  }
}
