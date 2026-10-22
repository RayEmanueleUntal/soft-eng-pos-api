import { ApiProperty } from '@nestjs/swagger';
import { ForwarderResponseDto } from './forwarder-response.dto';

export class PaginationMetaDto {
  @ApiProperty({ example: 50 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}

export class PaginatedForwardersResponseDto {
  @ApiProperty({ type: [ForwarderResponseDto] })
  data!: ForwarderResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
