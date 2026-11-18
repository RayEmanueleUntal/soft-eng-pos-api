import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { SortOrder } from 'src/common/enums';

export enum SupplierSortBy {
  NAME = 'name',
  LEAD_TIME = 'lead_time_days',
}

export class GetSuppliersDto {
  @ApiPropertyOptional({
    example: 'Hardware',
    description:
      'Search string matching supplier name, contact person, email, or location.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter active or inactive suppliers.',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    enum: SupplierSortBy,
    description:
      'Field to sort by (name or lead_time_days). Defaults to newest first (id desc) if omitted.',
  })
  @IsOptional()
  @IsEnum(SupplierSortBy)
  sort_by?: SupplierSortBy;

  @ApiPropertyOptional({
    enum: SortOrder,
    default: SortOrder.ASC,
    description: 'Sort direction (asc or desc).',
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sort_order?: SortOrder = SortOrder.ASC;

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
  limit?: number = 10;
}
