import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetCategoryByNameQueryDto {
  @ApiProperty({
    example: 'Bolts',
    description: 'Category name to search for (case-insensitive)',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;
}
