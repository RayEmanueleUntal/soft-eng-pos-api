import { ApiProperty } from '@nestjs/swagger';

export class DeleteProductResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 12 })
  productId!: number;

  @ApiProperty({ example: 'Hex Bolt M8-1.25 x 30mm' })
  productName!: string;

  @ApiProperty({ example: 'Product permanently removed from database.' })
  message!: string;
}
