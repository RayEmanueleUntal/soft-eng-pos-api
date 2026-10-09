import { ApiProperty } from '@nestjs/swagger';
import { SupplierResponseDto } from './supplier-response.dto';

export class PaginatedSuppliersResponseDto {
  @ApiProperty({ type: [SupplierResponseDto] })
  data!: SupplierResponseDto[];

  @ApiProperty({ example: 45, description: 'Total matched supplier records' })
  total!: number;

  @ApiProperty({ example: 1, description: 'Current active page' })
  page!: number;

  @ApiProperty({ example: 10, description: 'Limit of records per page' })
  limit!: number;

  @ApiProperty({ example: 5, description: 'Total available pages' })
  totalPages!: number;
}
