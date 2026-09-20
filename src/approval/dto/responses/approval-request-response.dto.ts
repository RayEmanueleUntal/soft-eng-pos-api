import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ApprovalRequest,
  RequestStatus,
  RequestType,
} from 'src/generated/prisma/client';

export class ApprovalRequestResponseDto {
  @ApiProperty({ example: 101 })
  id!: number;

  @ApiProperty({ enum: RequestType, example: RequestType.REFUND_TRANSACTION })
  type!: RequestType;

  @ApiProperty({ enum: RequestStatus, example: RequestStatus.PENDING })
  status!: RequestStatus;

  @ApiProperty({ example: 12 })
  requestedById!: number;

  @ApiPropertyOptional({ example: 2 })
  reviewedById!: number | null;

  @ApiProperty({ example: { refundId: 'REF-1234', amount: 150.0 } })
  payload!: any;

  @ApiPropertyOptional({ example: 'Customer cannot provide receipt' })
  rejectionReason!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(entity: ApprovalRequest): ApprovalRequestResponseDto {
    return {
      id: entity.id,
      type: entity.type,
      status: entity.status,
      requestedById: entity.requestedById,
      reviewedById: entity.reviewedById,
      payload: entity.payload,
      rejectionReason: entity.rejectionReason,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
