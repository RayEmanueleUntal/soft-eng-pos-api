import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { UnitOfMeasure } from 'src/generated/prisma/enums';

export class StockOutDto {
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
  taken_qty!: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'removed bad items' })
  reason?: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    example: true,
    description: 'When set to true, negative stock is allowed',
  })
  allowOverride?: boolean = false;
}
