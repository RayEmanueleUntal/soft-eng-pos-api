import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({
    example: 'Hardware Supplies Co.',
    description: 'Unique name of the vendor or supplier company.',
  })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Primary contact person or sales representative.',
  })
  @IsOptional()
  @IsString()
  contact_person?: string;

  @ApiPropertyOptional({
    example: 'john.doe@hardwaresupplies.com',
    description: 'Official communication email address.',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: '+639171234567',
    description: 'Primary contact telephone or mobile number.',
  })
  @IsOptional()
  @IsString()
  contact_number?: string;

  @ApiProperty({
    example: '123 Industrial Zone, Valenzuela City',
    description: 'Physical location or office address of the supplier.',
  })
  @IsNotEmpty()
  @IsString()
  location!: string;

  @ApiProperty({
    example: 7,
    description: 'Estimated fulfillment lead time in days.',
  })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  lead_time_days!: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Operational status flag for the supplier.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
