import { Type, Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  Min,
} from 'class-validator';
import { TransactionType, UnitOfMeasure } from 'src/generated/prisma/enums';

export class ItemDto {
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  productId!: number;

  @IsNotEmpty()
  @IsPositive()
  @Type(() => Number)
  quantity_sold!: number;

  @IsNotEmpty()
  @IsEnum(UnitOfMeasure)
  current_uom!: UnitOfMeasure;

  @IsOptional()
  @IsEnum(TransactionType)
  transaction_type?: TransactionType = TransactionType.RETAIL;

  @IsOptional()
  @Min(0)
  @Type(() => Number)
  line_discount?: number;
}
