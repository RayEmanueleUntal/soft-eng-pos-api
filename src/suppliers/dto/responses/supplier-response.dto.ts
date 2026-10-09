import { ApiProperty } from '@nestjs/swagger';
import { Supplier } from 'src/generated/prisma/client';

export class SupplierResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the supplier' })
  id!: number;

  @ApiProperty({
    example: 'AeroFastener Industrial Supplies Inc.',
    description: 'Supplier name',
  })
  name!: string;

  @ApiProperty({ example: '+63 917 555 0192', description: 'Contact details' })
  contact_info!: string;

  @ApiProperty({
    example: 'Davao City Warehouse Zone',
    description: 'Physical location/address',
  })
  location!: string;

  @ApiProperty({
    example: 5,
    description: 'Average delivery lead time in days',
  })
  lead_time_days!: number;

  static fromEntity(entity: Supplier): SupplierResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      contact_info: entity.contact_info,
      location: entity.location,
      lead_time_days: entity.lead_time_days,
    };
  }
}
