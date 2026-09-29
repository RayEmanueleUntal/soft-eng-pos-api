import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from './pagination-meta.dto';
import { TransactionListItemResponseDto } from './transaction-list-item-response.dto';

export class PaginatedTransactionsResponseDto {
  @ApiProperty({ type: [TransactionListItemResponseDto] })
  data!: TransactionListItemResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;

  static fromEntities(
    transactions: any[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedTransactionsResponseDto {
    return {
      data: transactions.map(TransactionListItemResponseDto.fromEntity),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
