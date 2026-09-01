import { ApiProperty } from '@nestjs/swagger';
import { Category } from 'src/generated/prisma/client';

export class CategoryResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Bolts' })
  name!: string;

  static fromEntity(entity: Category): CategoryResponseDto {
    return {
      id: entity.id,
      name: entity.name,
    };
  }
}
