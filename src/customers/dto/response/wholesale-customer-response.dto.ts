import { ApiProperty } from '@nestjs/swagger';
import { WholeSaleCustomer } from 'src/generated/prisma/client';

export class WholesaleCustomerResponseDto {
  @ApiProperty({ example: 1 })
  customerId!: number;

  @ApiProperty({ example: 'Dela Cruz Trading Enterprises' })
  company_name!: string;

  @ApiProperty({ example: 50000.0 })
  credit_limit!: number;

  @ApiProperty({ example: 0.0 })
  outstanding_balance!: number;

  static fromEntity(entity: WholeSaleCustomer): WholesaleCustomerResponseDto {
    return {
      customerId: entity.customerId,
      company_name: entity.company_name,
      credit_limit: entity.credit_limit.toNumber(),
      outstanding_balance: entity.outstanding_balance.toNumber(),
    };
  }
}
