import { ApiProperty } from '@nestjs/swagger';
import { PurchaseOrderResponseDto } from './purchase-order-response.dto';

export class PaginatedPurchaseOrdersResponseDto {
  @ApiProperty({ type: [PurchaseOrderResponseDto] })
  data!: PurchaseOrderResponseDto[];

  @ApiProperty({ example: 45 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;

  static fromEntity(
    data: PurchaseOrderResponseDto[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedPurchaseOrdersResponseDto {
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
