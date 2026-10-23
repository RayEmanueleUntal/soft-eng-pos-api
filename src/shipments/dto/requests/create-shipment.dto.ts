import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Request payload for creating/logging forwarder details for a transaction.
 */
export class CreateShipmentDto {
  @ApiProperty({
    description:
      'The ID of the completed customer transaction/order being dispatched.',
    example: 101,
  })
  @IsInt()
  @IsNotEmpty()
  transactionId!: number;

  @ApiProperty({
    description: 'The ID of the assigned forwarder/courier company.',
    example: 3,
  })
  @IsInt()
  @IsNotEmpty()
  forwarderId!: number;

  @ApiPropertyOptional({
    description: 'Optional waybill, consignment, or courier tracking number.',
    example: 'LBC-987654321-PH',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tracking_number?: string;

  @ApiPropertyOptional({
    description:
      'Optional delivery instructions, destination remarks, or special notes.',
    example: 'Deliver to Warehouse Gate 2. Call recipient before delivery.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
