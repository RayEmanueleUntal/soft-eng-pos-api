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
  search?: string;

  @IsOptional()
  @IsPositive()
  categoryId?: number;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  thread?: string;

  @IsOptional()
  @IsString()
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
