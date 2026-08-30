import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerType } from 'src/generated/prisma/enums';
import { WholesaleCustomerResponseDto } from './wholesale-customer-response.dto';
import { Customer, WholeSaleCustomer } from 'src/generated/prisma/client';

type CustomerWithWholesale = Customer & {
  wholesale?: WholeSaleCustomer | null;
};

export class CustomerResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Juan Dela Cruz' })
  name!: string;

  @ApiProperty({ example: '09171234567' })
  contact_number!: string;

  @ApiProperty({ enum: CustomerType, example: CustomerType.RETAIL })
  type!: CustomerType;

  @ApiPropertyOptional({ type: WholesaleCustomerResponseDto, nullable: true })
  wholesale!: WholesaleCustomerResponseDto | null;

  @ApiProperty({ example: '2026-08-30T15:00:00.000Z' })
  createdAt!: Date;

  static fromEntity(entity: CustomerWithWholesale): CustomerResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      contact_number: entity.contact_number,
      type: entity.type,
      wholesale: entity.wholesale
        ? WholesaleCustomerResponseDto.fromEntity(entity.wholesale)
        : null,
      createdAt: entity.createdAt,
    };
  }
}
