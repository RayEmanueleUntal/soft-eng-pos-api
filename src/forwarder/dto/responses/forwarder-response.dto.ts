import { ApiProperty } from '@nestjs/swagger';

export class ForwarderResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'LBC Express' })
  company_name!: string;

  @ApiProperty({ example: '+63 917 123 4567 / support@lbcexpress.com' })
  tracking_contact_info!: string;

  @ApiProperty({ example: true })
  is_active!: boolean;

  @ApiProperty({ example: '2026-10-22T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-10-22T10:00:00.000Z' })
  updatedAt!: Date;

  /**
   * Transforms and sanitizes a Prisma Forwarder database entity into an API response contract.
   */
  static fromEntity(entity: any): ForwarderResponseDto {
    return {
      id: entity.id,
      company_name: entity.company_name,
      tracking_contact_info: entity.tracking_contact_info,
      is_active: entity.is_active,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
