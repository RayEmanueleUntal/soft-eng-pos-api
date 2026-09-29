import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SearchBinLocQueryDto {
  @ApiProperty({
    example: 'Aisle-01',
    description: 'Aisle number/code to search',
  })
  @IsString()
  @IsNotEmpty()
  aisle_number!: string;

  @ApiProperty({
    example: 'Shelf-B',
    description: 'Shelf location identifier to search',
  })
  @IsString()
  @IsNotEmpty()
  shelf_location!: string;
}
