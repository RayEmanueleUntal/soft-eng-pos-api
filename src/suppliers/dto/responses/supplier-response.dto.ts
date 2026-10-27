import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Supplier } from 'src/generated/prisma/client';

export class SupplierResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Hardware Supplies Co.' })
  name!: string;

  @ApiPropertyOptional({ example: 'John Doe', nullable: true })
  contact_person!: string | null;

  @ApiPropertyOptional({
    example: 'john.doe@hardwaresupplies.com',
    nullable: true,
  })
  email!: string | null;

  @ApiPropertyOptional({ example: '+639171234567', nullable: true })
  contact_number!: string | null;

  @ApiProperty({ example: '123 Industrial Zone, Valenzuela City' })
  location!: string;

  @ApiProperty({ example: 7 })
  lead_time_days!: number;

  @ApiProperty({ example: true })
  is_active!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  /**
   * Transforms raw Prisma entity into sanitized response DTO format.
   */
  static fromEntity(entity: Supplier): SupplierResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      contact_person: entity.contact_person,
      email: entity.email,
      contact_number: entity.contact_number,
      location: entity.location,
      lead_time_days: entity.lead_time_days,
      is_active: entity.is_active,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
