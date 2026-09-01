import { ApiProperty } from '@nestjs/swagger';
import { BinLocation } from 'src/generated/prisma/client';

export class BinLocationResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Aisle 3' })
  aisle_number!: string;

  @ApiProperty({ example: 'Shelf B' })
  shelf_location!: string;

  static fromEntity(entity: BinLocation): BinLocationResponseDto {
    return {
      id: entity.id,
      aisle_number: entity.aisle_number,
      shelf_location: entity.shelf_location,
    };
  }
}
