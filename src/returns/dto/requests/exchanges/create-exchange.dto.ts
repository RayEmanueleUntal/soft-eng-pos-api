import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateRefundDto } from '../refund/create-refund.dto';

export class CreateExchangeDto extends CreateRefundDto {
  @ApiProperty({
    example: false,
    description:
      'If true, user is requesting to override stock limits if replacement item is out of stock',
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  allowStockOverride?: boolean = false;
}
