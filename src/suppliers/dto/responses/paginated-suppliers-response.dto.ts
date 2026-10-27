import { ApiProperty } from '@nestjs/swagger';
import { SupplierResponseDto } from './supplier-response.dto';

export class PaginatedSuppliersResponseDto {
  @ApiProperty({ type: [SupplierResponseDto] })
  data!: SupplierResponseDto[];

  @ApiProperty({ example: 50 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;
}
