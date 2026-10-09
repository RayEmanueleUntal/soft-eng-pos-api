import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({
    description: 'Legal or trade name of the supplier',
    example: 'AeroFastener Industrial Supplies Inc.',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Primary contact details (phone, email, or contact person)',
    example: '+63 917 555 0192 / sales@aerofastener.ph',
  })
  @IsString()
  @IsNotEmpty()
  contact_info!: string;

  @ApiProperty({
    description: 'Physical warehouse or office location address',
    example: 'Building 4, Industrial Zone, Davao City',
  })
  @IsString()
  @IsNotEmpty()
  location!: string;

  @ApiProperty({
    description: 'Estimated order delivery lead time in days',
    example: 5,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  lead_time_days!: number;

  @ApiPropertyOptional({
    description:
      'Whether the supplier is active for taking new purchase orders',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean = true;
}
