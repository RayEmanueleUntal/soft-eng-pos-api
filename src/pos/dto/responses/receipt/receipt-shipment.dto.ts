import { ApiProperty } from '@nestjs/swagger';
import { TrackingStatus } from 'src/generated/prisma/enums';

export class ReceiptShipmentDto {
  @ApiProperty({ example: 1, description: 'Shipment record ID' })
  id!: number;

  @ApiProperty({
    example: 'LBC Express',
    description: 'Name of the shipping forwarder / carrier',
  })
  forwarder_name!: string;

  @ApiProperty({ example: '2026-09-01T10:30:00.000Z' })
  dispatch_date!: Date;

  @ApiProperty({
    enum: TrackingStatus,
    example: TrackingStatus.PENDING,
    description: 'Current logistics dispatch status',
  })
  tracking_status!: TrackingStatus;
}
