import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { SortOrder } from 'src/common/enums';
import { CustomerType } from 'src/generated/prisma/enums';

export enum CustomerSortBy {
  CREATED_AT = 'createdAt',
  NAME = 'name',
  CREDIT_LIMIT = 'credit_limit',
  OUTSTANDING_BALANCE = 'outstanding_balance',
}

export class GetCustomerDto {
  @ApiPropertyOptional({
    example: 'Juan',
    description:
      'Unified search query. Splits into keywords and matches against name, contact_number, and wholesale company_name.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'Juan Dela Cruz',
    description: 'Exact or partial name filter',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: '09171234567',
    description: 'Exact or partial contact number filter',
  })
  @IsOptional()
  @IsString()
  contact_number?: string;

  @ApiPropertyOptional({
    enum: CustomerType,
    enumName: 'CustomerType',
    description: 'Filter by customer classification type (RETAIL or WHOLESALE)',
  })
  @IsOptional()
  @IsEnum(CustomerType, {
    message: `type must be one of the following values: ${Object.values(CustomerType).join(', ')}`,
  })
  type?: CustomerType;

  @ApiPropertyOptional({
    example: 'Dela Cruz Trading',
    description: 'Partial company name filter for wholesale profiles',
  })
  @IsOptional()
  @IsString()
  company_name?: string;

  @ApiPropertyOptional({
    enum: CustomerSortBy,
    enumName: 'CustomerSortBy',
    default: CustomerSortBy.CREATED_AT,
    example: CustomerSortBy.NAME,
    description:
      'Field to sort results by: createdAt (default), name (alphabetical), credit_limit, or outstanding_balance.',
  })
  @IsOptional()
  @IsEnum(CustomerSortBy, {
    message: `sortBy must be one of the following values: ${Object.values(CustomerSortBy).join(', ')}`,
  })
  sortBy?: CustomerSortBy = CustomerSortBy.CREATED_AT;

  @ApiPropertyOptional({
    enum: SortOrder,
    enumName: 'SortOrder',
    default: SortOrder.DESC,
    example: SortOrder.ASC,
    description:
      'Sort direction: asc (A-Z / Low to High) or desc (Z-A / High to Low). Defaults to desc.',
  })
  @IsOptional()
  @IsEnum(SortOrder, {
    message: `sortOrder must be one of the following values: ${Object.values(SortOrder).join(', ')}`,
  })
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({
    default: 1,
    example: 1,
    description: 'Page number for pagination',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    default: 10,
    example: 10,
    description: 'Number of customer records per page',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;
}
