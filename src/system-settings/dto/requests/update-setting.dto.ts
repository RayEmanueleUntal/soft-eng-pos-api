import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateSettingDto {
  @ApiProperty({
    example: '30',
    description: 'Updated value string',
  })
  @IsString()
  @IsNotEmpty()
  value!: string;

  @ApiPropertyOptional({
    example: 'Updated return window policy',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
