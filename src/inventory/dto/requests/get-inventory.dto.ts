import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class InventoryDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Hex Bolt M8-1.25 x 30mm' })
  search?: string;

  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  categoryId?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'M8 x 30mm' })
  size?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Coarse (UNC)' })
  thread?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Stainless 304' })
  material?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
