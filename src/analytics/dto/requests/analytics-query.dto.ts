import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    description:
      'Start date for filtering sales revenue, COGS, and OpEx (ISO-8601 format)',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({
    description:
      'End date for filtering sales revenue, COGS, and OpEx (ISO-8601 format)',
    example: '2026-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}
