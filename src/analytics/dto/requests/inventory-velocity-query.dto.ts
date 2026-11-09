import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export enum FastMovingSortBy {
  QUANTITY = 'QUANTITY',
  REVENUE = 'REVENUE',
}

export class InventoryVelocityQueryDto {
  @ApiPropertyOptional({
    description:
      'Start date for filtering fast-moving items sales velocity (ISO-8601 format)',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({
    description:
      'End date for filtering fast-moving items sales velocity (ISO-8601 format)',
    example: '2026-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({
    description:
      'Aging threshold in days to identify slow-moving/dead stock (e.g., 30, 60, 90 days)',
    default: 30,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  agingDays?: number = 30;

  @ApiPropertyOptional({
    description:
      'Maximum sales threshold during aging period to consider item slow-moving (default: 0 for pure dead stock)',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxSalesThreshold?: number = 0;

  @ApiPropertyOptional({
    description: 'Sorting criteria for fast-moving items (QUANTITY or REVENUE)',
    enum: FastMovingSortBy,
    default: FastMovingSortBy.QUANTITY,
  })
  @IsOptional()
  @IsEnum(FastMovingSortBy)
  sortBy?: FastMovingSortBy = FastMovingSortBy.QUANTITY;

  @ApiPropertyOptional({
    description: 'Maximum number of items to return per table',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
