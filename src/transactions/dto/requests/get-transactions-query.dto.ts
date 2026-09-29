import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { TransactionStatus, TransactionType } from 'src/generated/prisma/enums';

export class GetTransactionsQueryDto {
  @ApiPropertyOptional({
    default: 1,
    minimum: 1,
    description: 'Page number for pagination',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    default: 10,
    minimum: 1,
    maximum: 100,
    description: 'Number of records per page',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({
    description:
      'Filter by search query (matches invoice number or customer name)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: TransactionStatus,
    description: 'Filter by transaction status',
  })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({
    enum: TransactionType,
    description: 'Filter by transaction type',
  })
  @IsOptional()
  @IsEnum(TransactionType)
  transaction_type?: TransactionType;

  @ApiPropertyOptional({
    description: 'Filter by staff ID who processed the transaction',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  staffId?: number;

  @ApiPropertyOptional({
    description: 'Filter by customer ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerId?: number;

  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'Start date filter (ISO format)',
  })
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'End date filter (ISO format)',
  })
  @IsOptional()
  @Type(() => Date)
  endDate?: Date;

  @ApiPropertyOptional({
    default: false,
    description: 'Include shipment logistics in response payload',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeShipments: boolean = false;

  @ApiPropertyOptional({
    default: false,
    description: 'Include return history logs in response payload',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeReturns: boolean = false;

  @ApiPropertyOptional({
    default: false,
    description: 'Include exchange history logs in response payload',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeExchanges: boolean = false;
}
