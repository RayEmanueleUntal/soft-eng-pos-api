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
  @IsPositive()
  quantity_changed!: number;

  @IsNotEmpty()
  @IsString()
  reason!: string;
}
