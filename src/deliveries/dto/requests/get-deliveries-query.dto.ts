import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  Min,
  Max,
  IsDateString,
  IsPositive,
  IsEnum,
} from 'class-validator';
import { SortOrder } from 'src/common/enums';

export enum DeliverySortField {
  DELIVERY_DATE = 'delivery_date',
}

export class GetDeliveriesQueryDto {
  @ApiPropertyOptional({
    example: 12,
    description: 'Filter deliveries by Purchase Order ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  poId?: number;

  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'Filter deliveries on/after date',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Filter deliveries on/before date',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    enum: DeliverySortField,
    default: DeliverySortField.DELIVERY_DATE,
    example: DeliverySortField.DELIVERY_DATE,
    description: 'Field to sort deliveries by. Defaults to delivery_date.',
  })
  @IsOptional()
  @IsEnum(DeliverySortField)
  sortBy?: DeliverySortField = DeliverySortField.DELIVERY_DATE;

  @ApiPropertyOptional({
    enum: SortOrder,
    default: SortOrder.DESC,
    example: SortOrder.DESC,
    description:
      'Sort direction: "desc" for Newest to Oldest (default), "asc" for Oldest to Newest.',
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
