import { ApiProperty } from '@nestjs/swagger';

export class GetProductCategoryResponseDto {
  @ApiProperty({ example: 1, description: 'Unique category identifier' })
  id!: number;

  @ApiProperty({ example: 'Bolts', description: 'Category name' })
  name!: string;

  static fromEntity(entity: {
    id: number;
    name: string;
  }): GetProductCategoryResponseDto {
    return {
      id: entity.id,
      name: entity.name,
    };
  }
}
