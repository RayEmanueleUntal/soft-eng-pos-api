import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class StockOutDto {
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
  added_qty!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
