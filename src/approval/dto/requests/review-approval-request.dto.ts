import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewApprovalRequestDto {
  @ApiPropertyOptional({
    example:
      'Customer provided an invalid receipt and product shows signs of intentional damage.',
    description:
      'Reason for rejecting the request (required when status is REJECTED)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  rejectionReason?: string;
}
