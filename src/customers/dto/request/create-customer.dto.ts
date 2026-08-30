import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { CustomerType } from 'src/generated/prisma/enums';

export class CreateCustomerDto {
  @ApiProperty({
    example: 'Juan Dela Cruz',
    description: 'Full name of the customer',
  })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({
    example: '09171234567',
    description: 'Mobile or telephone contact number',
  })
  @IsNotEmpty()
  @IsString()
  contact_number!: string;

  @ApiPropertyOptional({
    enum: CustomerType,
    enumName: 'CustomerType',
    default: CustomerType.RETAIL,
    example: CustomerType.RETAIL,
    description: 'Classification rate type for the customer',
  })
  @IsOptional()
  @IsEnum(CustomerType)
  type?: CustomerType = CustomerType.RETAIL;

  @ApiPropertyOptional({
    default: false,
    example: false,
    description:
      'Bypasses duplicate contact_number validation if set to true (used when cashiers explicitly confirm creating a duplicate record).',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  allowDuplicate?: boolean = false;

  @ApiPropertyOptional({
    example: 50000.0,
    description: 'Approved store credit limit. Required if type is WHOLESALE.',
  })
  @ValidateIf((o) => o.type === CustomerType.WHOLESALE)
  @IsNotEmpty({ message: 'credit_limit is required for WHOLESALE customers.' })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  credit_limit?: number;

  @ApiPropertyOptional({
    example: 0.0,
    default: 0.0,
    description: 'Initial outstanding balance. Defaults to 0 if omitted.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  outstanding_balance?: number = 0;

  @ApiPropertyOptional({
    example: 'Dela Cruz Trading Enterprises',
    description:
      'Registered business/company name. Required if type is WHOLESALE.',
  })
  @ValidateIf((o) => o.type === CustomerType.WHOLESALE)
  @IsNotEmpty({ message: 'company_name is required for WHOLESALE customers.' })
  @IsString()
  company_name?: string;
}
