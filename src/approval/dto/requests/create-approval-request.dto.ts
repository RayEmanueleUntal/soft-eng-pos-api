import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject } from 'class-validator';
import { RequestType } from 'src/generated/prisma/client';

export class CreateApprovalRequestDto {
  @ApiProperty({
    enum: RequestType,
    example: 'REFUND_TRANSACTION',
    description: 'The type of request requiring manager approval',
  })
  @IsEnum(RequestType)
  @IsNotEmpty()
  type!: RequestType;

  @ApiProperty({
    example: {
      transactionId: 1042,
      amount: 450.5,
      reason: 'Defective item returned within return window',
    },
    description:
      'JSON payload containing specific parameter details needed to execute the domain action upon approval',
  })
  @IsObject()
  @IsNotEmpty()
  payload!: Record<string, any>;
}
