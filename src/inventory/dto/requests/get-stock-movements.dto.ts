import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { MovementType } from 'src/generated/prisma/enums';
import { SortOrder } from 'src/common/enums';

export enum StockMovementSortBy {
  NAME = 'name',
  QUANTITY_CHANGED = 'quantity_changed',
  DATE = 'date',
}

export class GetStockMovementsDto {
  @ApiPropertyOptional({
    description: 'Filter by specific product ID',
    example: 12,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId?: number;

  @ApiPropertyOptional({
    description: 'Filter by movement type',
    enum: MovementType,
    example: MovementType.ADJUSTMENT,
  })
  @IsOptional()
  @IsEnum(MovementType)
  type?: MovementType;

  @ApiPropertyOptional({
    description: 'Filter by staff user ID who initiated the movement',
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  staffId?: number;

  @ApiPropertyOptional({
    description: 'Filter by staff user ID who approved an override',
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  approvedById?: number;

  @ApiPropertyOptional({
    description: 'Filter by override status',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isOverride?: boolean;

  @ApiPropertyOptional({
    description: 'Filter movements on or after this date (ISO 8601 format)',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter movements on or before this date (ISO 8601 format)',
    example: '2026-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    enum: StockMovementSortBy,
    default: StockMovementSortBy.DATE,
    example: StockMovementSortBy.DATE,
    description:
      'Field to sort by: name (Product A-Z / Z-A), quantity_changed (Qty Adj High-Low / Low-High), or date (Newest / Oldest)',
  })
  @IsOptional()
  @IsEnum(StockMovementSortBy)
  sortBy?: StockMovementSortBy = StockMovementSortBy.DATE;

  @ApiPropertyOptional({
    enum: SortOrder,
    default: SortOrder.DESC,
    example: SortOrder.DESC,
    description:
      'Sort direction: asc (A-Z, Low to High, Oldest to Newest) or desc (Z-A, High to Low, Newest to Oldest)',
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of records per page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
