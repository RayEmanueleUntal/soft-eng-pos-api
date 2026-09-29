import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from 'src/transactions/dto/responses/pagination-meta.dto';
import { BinLocationResponseDto } from './bin-location-response.dto';

export class PaginatedBinLocationsResponseDto {
  @ApiProperty({ type: [BinLocationResponseDto] })
  data!: BinLocationResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;

  static fromEntities(
    binLocations: any[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedBinLocationsResponseDto {
    return {
      data: binLocations.map(BinLocationResponseDto.fromEntity),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
