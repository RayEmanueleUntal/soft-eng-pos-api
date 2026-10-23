import { ApiProperty } from '@nestjs/swagger';
import { ShipmentResponseDto } from './shipment-response.dto';

export class PaginatedShipmentsMetaDto {
  @ApiProperty({ example: 25 })
  totalItems!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;

  @ApiProperty({ example: 1 })
  currentPage!: number;

  @ApiProperty({ example: 10 })
  itemsPerPage!: number;
}

/**
 * Paginated response wrapper for Shipment list queries.
 */
export class PaginatedShipmentsResponseDto {
  @ApiProperty({ type: [ShipmentResponseDto] })
  items!: ShipmentResponseDto[];

  @ApiProperty({ type: PaginatedShipmentsMetaDto })
  meta!: PaginatedShipmentsMetaDto;
}
