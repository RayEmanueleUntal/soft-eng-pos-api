import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TrackingStatus } from 'src/generated/prisma/enums';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Request payload for updating the status of an outbound shipment.
 */
export class UpdateShipmentStatusDto {
  @ApiProperty({
    description: 'The new tracking status of the shipment.',
    enum: TrackingStatus,
    example: TrackingStatus.DISPATCHED,
  })
  @IsEnum(TrackingStatus)
  @IsNotEmpty()
  status!: TrackingStatus;

  @ApiPropertyOptional({
    description:
      'Optional notes regarding the status update (e.g., date delivered, forwarder remarks).',
    example: 'Handed over to courier driver John Doe.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
