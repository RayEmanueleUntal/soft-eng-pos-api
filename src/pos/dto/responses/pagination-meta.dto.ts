import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ example: 105, description: 'Total records matching query' })
  total!: number;

  @ApiProperty({ example: 1, description: 'Current active page' })
  page!: number;

  @ApiProperty({ example: 20, description: 'Items per page limit' })
  limit!: number;

  @ApiProperty({ example: 6, description: 'Total available pages' })
  totalPages!: number;
}
