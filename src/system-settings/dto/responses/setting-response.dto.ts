import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SystemSetting } from 'src/generated/prisma/client';

export class SettingResponseDto {
  @ApiProperty({
    example: 'RETURN_WINDOW_DAYS',
    description: 'Unique key identifying the setting',
  })
  key!: string;

  @ApiProperty({
    example: '14',
    description: 'Value stored as string',
  })
  value!: string;

  @ApiPropertyOptional({
    example: 'Number of days a customer has to initiate a return',
    description: 'Optional human-readable explanation',
  })
  description!: string | null;

  @ApiProperty({
    example: '2026-03-29T10:00:00.000Z',
    description: 'Timestamp when the setting was last updated',
  })
  updatedAt!: Date;

  /**
   * Static Factory Method to transform Prisma SystemSetting model into response DTO
   */
  static fromEntity(setting: SystemSetting): SettingResponseDto {
    return {
      key: setting.key,
      value: setting.value,
      description: setting.description,
      updatedAt: setting.updatedAt,
    };
  }
}
