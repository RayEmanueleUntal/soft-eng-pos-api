import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { UnitOfMeasure } from 'src/generated/prisma/enums';

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
  @IsEnum(UnitOfMeasure)
  @ApiProperty({ example: 'PCS' })
  current_uom!: UnitOfMeasure;

  @IsNotEmpty()
  @IsPositive()
  @Type(() => Number)
  added_qty!: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'delivery arrived' })
  reason?: string;
}
