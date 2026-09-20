import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSettingDto {
  @ApiProperty({
    example: 'RETURN_WINDOW_DAYS',
    description: 'Unique key identifying the setting',
  })
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty({
    example: '14',
    description:
      'Value stored as string (can represent numbers, booleans, or JSON strings)',
  })
  @IsString()
  @IsNotEmpty()
  value!: string;

  @ApiPropertyOptional({
    example: 'Number of days a customer has to initiate a product return',
    description: 'Optional human-readable explanation',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
