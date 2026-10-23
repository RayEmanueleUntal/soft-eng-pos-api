import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Request payload for updating general shipment information.
 */
export class UpdateShipmentDto {
  @ApiPropertyOptional({
    description: 'Updated ID of the assigned forwarder.',
    example: 4,
  })
  @IsOptional()
  @IsInt()
  forwarderId?: number;

  @ApiPropertyOptional({
    description: 'Updated tracking or waybill number.',
    example: 'JNT-2026-112233',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tracking_number?: string;

  @ApiPropertyOptional({
    description: 'Updated delivery instructions or remarks.',
    example: 'Updated destination address upon customer request.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
