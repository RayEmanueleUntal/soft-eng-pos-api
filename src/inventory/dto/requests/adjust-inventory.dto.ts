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

export class AdjustInventoryDto {
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
  @Type()
  @ApiProperty({ example: 'PCS' })
  current_uom!: UnitOfMeasure;

  @IsNotEmpty()
  @IsPositive()
  @Type(() => Number)
  new_count!: number;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'overwriting inventory count' })
  reason!: string;
}
