import { ApiProperty } from '@nestjs/swagger';
import { CustomerPaymentResponseDto } from './customer-payment-response.dto';

export class PaginatedCustomerPaymentsResponseDto {
  @ApiProperty({ type: [CustomerPaymentResponseDto] })
  data!: CustomerPaymentResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;
}
