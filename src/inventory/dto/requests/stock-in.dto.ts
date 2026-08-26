import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class StockInDto {
  @IsNotEmpty()
  @IsPositive()
  @Type(() => Number)
  productId!: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date?: Date;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'pcs' })
  current_uom!: string;

  @IsNotEmpty()
  @IsPositive()
  @Type(() => Number)
  added_qty!: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'delivery arrived' })
  reason?: string;
}
