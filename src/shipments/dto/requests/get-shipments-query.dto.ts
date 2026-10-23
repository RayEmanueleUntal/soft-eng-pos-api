import { ApiPropertyOptional } from '@nestjs/swagger';
import { TrackingStatus } from 'src/generated/prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Query DTO for filtering and paginating shipments.
 */
export class GetShipmentsQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination.',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page.',
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

  @ApiPropertyOptional({
    description: 'Filter shipments by tracking status.',
    enum: TrackingStatus,
  })
  @IsOptional()
  @IsEnum(TrackingStatus)
  status?: TrackingStatus;

  @ApiPropertyOptional({
    description: 'Filter shipments by specific forwarder ID.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  forwarderId?: number;

  @ApiPropertyOptional({
    description: 'Search term for tracking number or invoice number.',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
