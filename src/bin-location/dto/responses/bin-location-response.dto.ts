import { ApiProperty } from '@nestjs/swagger';

export class BinLocationResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Unique bin location primary key ID',
  })
  id!: number;

  @ApiProperty({ example: 'Aisle-01', description: 'Aisle number/code' })
  aisle_number!: string;

  @ApiProperty({ example: 'Shelf-B', description: 'Shelf location code' })
  shelf_location!: string;

  static fromEntity(entity: {
    id: number;
    aisle_number: string;
    shelf_location: string;
  }): BinLocationResponseDto {
    return {
      id: entity.id,
      aisle_number: entity.aisle_number,
      shelf_location: entity.shelf_location,
    };
  }
}
