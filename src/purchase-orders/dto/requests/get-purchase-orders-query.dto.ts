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
import { POStatus } from 'src/generated/prisma/client';

export class GetPurchaseOrdersQueryDto {
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
}
