import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class AdjustInventoryDto {
  @IsNotEmpty()
  @IsPositive()
  productId!: number;

  @IsOptional()
  @IsString()
  @IsDateString()
  date?: string;

  @IsNotEmpty()
  @IsString()
  current_uom!: string;

  @IsNotEmpty()
  @IsPositive()
  new_count!: number;

  @IsNotEmpty()
  @IsString()
  reason!: string;
}
