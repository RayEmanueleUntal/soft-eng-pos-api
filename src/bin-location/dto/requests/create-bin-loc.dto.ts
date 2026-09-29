import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBinLocDto {
  @ApiProperty({
    example: 'Aisle-01',
    description: 'Aisle designation code or number',
  })
  @IsString()
  @IsNotEmpty()
  aisle_number!: string;

  @ApiProperty({
    example: 'Shelf-B',
    description: 'Shelf or rack location identifier within the aisle',
  })
  @IsString()
  @IsNotEmpty()
  shelf_location!: string;
}
