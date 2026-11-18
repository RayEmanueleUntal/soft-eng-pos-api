import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { SortOrder } from 'src/common/enums';
import { POStatus } from 'src/generated/prisma/client';

export enum PurchaseOrderSortBy {
  ORDER_DATE = 'order_date',
  GRAND_TOTAL = 'grand_total',
  SUPPLIER = 'supplier',
  ID = 'id',
}

export class GetPurchaseOrdersQueryDto {
  @ApiPropertyOptional({ enum: POStatus, example: POStatus.PENDING })
  @IsOptional()
  @IsEnum(POStatus)
  status?: POStatus;

  @ApiPropertyOptional({ example: 5, description: 'Filter by Supplier ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  supplierId?: number;

  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'Filter orders on or after date',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Filter orders on or before date',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    enum: PurchaseOrderSortBy,
    default: PurchaseOrderSortBy.ORDER_DATE,
    description:
      'Field to sort purchase orders by: order_date (Date), grand_total (Total Cost), supplier (Supplier Name), or id (PO #ID).',
  })
  @IsOptional()
  @IsEnum(PurchaseOrderSortBy)
  sortBy?: PurchaseOrderSortBy = PurchaseOrderSortBy.ORDER_DATE;

  @ApiPropertyOptional({
    enum: SortOrder,
    default: SortOrder.DESC,
    description:
      'Sort direction: asc (Oldest / Low to High / A-Z) or desc (Newest / High to Low / Z-A).',
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
