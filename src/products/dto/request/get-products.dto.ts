import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class GetProductsDto {
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
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  @ApiPropertyOptional({
    example: true,
    description:
      'Filter products whose current_quantity is at or below their reorder_point_ROP',
  })
  belowRop?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiProperty({ example: 1 })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @ApiProperty({ example: 12 })
  limit?: number = 15;
}
