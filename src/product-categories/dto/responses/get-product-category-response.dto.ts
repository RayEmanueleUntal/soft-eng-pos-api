import { ApiProperty } from '@nestjs/swagger';

export class GetProductCategoryResponseDto {
  @ApiProperty({
    example: 101,
    description: 'Unique product category primary key ID',
  })
  id!: number;

  @ApiProperty({
    example: 'Nuts',
    description: 'Product category name',
  })
  categoryName!: string;

  static fromEntities(
    id: number,
    categoryName: string,
  ): GetProductCategoryResponseDto {
    return {
      id,
      categoryName,
    };
  }
}
