import { ConflictException } from '@nestjs/common';

export interface ExistingProductSummary {
  id: number;
  sku: string | null;
  name: string;
}

export class DuplicateProductException extends ConflictException {
  constructor(
    existingProduct: ExistingProductSummary,
    reason: 'SKU' | 'ATTRIBUTES',
  ) {
    const message =
      reason === 'SKU'
        ? `A product with SKU "${existingProduct.sku}" already exists.`
        : `A product with identical fastener attributes ("${existingProduct.name}", ID #${existingProduct.id}) already exists. Pass allowDuplicate=true to bypass.`;

    super({
      statusCode: 409,
      error: 'Conflict',
      code:
        reason === 'SKU'
          ? 'DUPLICATE_PRODUCT_SKU'
          : 'DUPLICATE_PRODUCT_ATTRIBUTES',
      message,
      existingProduct,
    });
  }
}
