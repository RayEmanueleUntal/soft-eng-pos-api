import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { POStatus } from 'src/generated/prisma/client';

export class UpdatePOStatusDto {
  @ApiProperty({
    enum: POStatus,
    example: POStatus.CANCELLED,
    description: 'New status for the Purchase Order (e.g., CANCELLED)',
  })
  @IsEnum(POStatus)
  po_status!: POStatus;
}
