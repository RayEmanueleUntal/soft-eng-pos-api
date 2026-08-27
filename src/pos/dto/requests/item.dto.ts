import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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
  @ApiProperty({
    example: 101,
    description: 'Unique ID of the product being purchased',
  })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  productId!: number;

  @ApiProperty({
    example: 2,
    description: 'Quantity of items to deduct from inventory and bill',
  })
  @IsNotEmpty()
  @IsPositive()
  @Type(() => Number)
  quantity_sold!: number;

  @ApiProperty({
    enum: UnitOfMeasure,
    enumName: 'UnitOfMeasure',
    example: UnitOfMeasure.PCS,
    description: 'Unit of measure used during checkout',
  })
  @IsNotEmpty()
  @IsEnum(UnitOfMeasure)
  current_uom!: UnitOfMeasure;

  @ApiPropertyOptional({
    enum: TransactionType,
    enumName: 'TransactionType',
    default: TransactionType.RETAIL,
    example: TransactionType.RETAIL,
    description:
      'Override transaction type per specific line item if applicable',
  })
  @IsOptional()
  @IsEnum(TransactionType)
  transaction_type?: TransactionType = TransactionType.RETAIL;

  @ApiPropertyOptional({
    example: 10.0,
    default: 0,
    description:
      'Direct discount amount applied specifically to this item line',
  })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  line_discount?: number;
}
