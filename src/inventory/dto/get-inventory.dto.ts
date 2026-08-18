import { IsOptional, IsPositive, IsString } from 'class-validator';

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
}
