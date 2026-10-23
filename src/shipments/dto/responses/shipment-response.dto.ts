import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TrackingStatus } from 'src/generated/prisma/client';

export class ForwarderSummaryDto {
  @ApiProperty({ example: 3 })
  id!: number;

  @ApiProperty({ example: 'LBC Express' })
  company_name!: string;

  @ApiProperty({ example: '+639171234567' })
  tracking_contact_info!: string;
}

export class TransactionSummaryDto {
  @ApiProperty({ example: 101 })
  id!: number;

  @ApiPropertyOptional({ example: 'INV-2026-0001' })
  invoice_number?: string;

  @ApiPropertyOptional({ example: 'Acme Hardware Inc.' })
  customer_name?: string;
}

/**
 * Standard API response representation of a Shipment entity.
 */
export class ShipmentResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 101 })
  transactionId!: number;

  @ApiProperty({ example: 3 })
  forwarderId!: number;

  @ApiPropertyOptional({ example: 'LBC-987654321-PH' })
  tracking_number!: string | null;

  @ApiProperty({ example: '2026-10-22T10:00:00.000Z' })
  dispatch_date!: Date;

  @ApiProperty({ enum: TrackingStatus, example: TrackingStatus.PENDING })
  tracking_status!: TrackingStatus;

  @ApiPropertyOptional({ example: 'Deliver before 5 PM' })
  notes!: string | null;

  @ApiProperty({ type: () => ForwarderSummaryDto })
  forwarder!: ForwarderSummaryDto | null;

  @ApiProperty({ type: () => TransactionSummaryDto })
  transaction!: TransactionSummaryDto | null;

  @ApiProperty({ example: '2026-10-22T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-10-22T10:00:00.000Z' })
  updatedAt!: Date;

  /**
   * Factory method to sanitize and transform Prisma result into DTO response.
   */
  static fromEntity(entity: any): ShipmentResponseDto {
    return {
      id: entity.id,
      transactionId: entity.transactionId,
      forwarderId: entity.forwarderId,
      tracking_number: entity.tracking_number ?? null,
      dispatch_date: entity.dispatch_date,
      tracking_status: entity.tracking_status,
      notes: entity.notes ?? null,
      forwarder: entity.forwarder
        ? {
            id: entity.forwarder.id,
            company_name: entity.forwarder.company_name,
            tracking_contact_info: entity.forwarder.tracking_contact_info,
          }
        : null,
      transaction: entity.transaction
        ? {
            id: entity.transaction.id,
            invoice_number: entity.transaction.invoice_number ?? null,
            customer_name:
              entity.transaction.customer?.name ?? 'Walk-in Customer',
          }
        : null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
