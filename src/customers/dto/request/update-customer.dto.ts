import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
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

export class UpdateCustomerDto {
  @ApiPropertyOptional({
    example: 'Juan Dela Cruz Jr.',
    description: 'Updated full name of the customer',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: '09179876543',
    description: 'Updated contact phone number',
  })
  @IsOptional()
  @IsString()
  contact_number?: string;

  @ApiPropertyOptional({
    enum: CustomerType,
    enumName: 'CustomerType',
    description: 'Update customer classification rate type',
  })
  @IsOptional()
  @IsEnum(CustomerType)
  type?: CustomerType;

  @ApiPropertyOptional({
    example: 'Dela Cruz Enterprises Ltd.',
    description:
      'Updated company name for wholesale profiles. Required if converting a retail customer to wholesale.',
  })
  @ValidateIf((o) => o.type === CustomerType.WHOLESALE)
  @IsNotEmpty({
    message: 'company_name is required when updating type to WHOLESALE.',
  })
  @IsOptional()
  @IsString()
  company_name?: string;

  @ApiPropertyOptional({
    example: 75000.0,
    description:
      'Updated store credit limit. Requires Manager or Admin authorization.',
  })
  @ValidateIf((o) => o.type === CustomerType.WHOLESALE)
  @IsNotEmpty({
    message: 'credit_limit is required when updating type to WHOLESALE.',
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  credit_limit?: number;

  @ApiPropertyOptional({
    example: 1250.0,
    description: 'Adjust current outstanding balance',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  outstanding_balance?: number;
}
