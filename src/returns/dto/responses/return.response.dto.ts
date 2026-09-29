import { ApiProperty } from '@nestjs/swagger';

export class ReturnResponseDto {
  @ApiProperty({
    example: 'Pending Approval',
    description: 'Status of the request',
  })
  message!: string;

  @ApiProperty({ example: 402, description: 'Approval Request ID' })
  approvalRequestId!: number;
}
