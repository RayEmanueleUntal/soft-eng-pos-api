import { ApiProperty } from '@nestjs/swagger';
import { DeliveryResponseDto } from './delivery-response.dto';

export class PaginatedDeliveriesResponseDto {
  @ApiProperty({ type: [DeliveryResponseDto] })
  data!: DeliveryResponseDto[];

  @ApiProperty({
    example: 45,
    description: 'Total count of delivery records matching query',
  })
  total!: number;

  @ApiProperty({ example: 1, description: 'Current page number' })
  page!: number;

  @ApiProperty({ example: 10, description: 'Number of items per page' })
  limit!: number;

  @ApiProperty({ example: 5, description: 'Total available pages' })
  totalPages!: number;

  /**
   * Factory method to construct a standard paginated response contract.
   */
  static fromEntity(
    data: DeliveryResponseDto[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedDeliveriesResponseDto {
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
