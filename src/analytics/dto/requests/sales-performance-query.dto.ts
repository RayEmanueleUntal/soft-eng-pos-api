import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional } from 'class-validator';

export enum GroupingInterval {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export class SalesPerformanceQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for filtering sales analytics (ISO-8601 format)',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'End date for filtering sales analytics (ISO-8601 format)',
    example: '2026-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({
    description:
      'Grouping interval for trend line chart (DAILY, WEEKLY, MONTHLY)',
    enum: GroupingInterval,
    default: GroupingInterval.DAILY,
  })
  @IsOptional()
  @IsEnum(GroupingInterval)
  interval?: GroupingInterval = GroupingInterval.DAILY;
}
