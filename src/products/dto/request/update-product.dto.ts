import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProductDto } from './create-product.dto';
import { CreateProductUomDto } from './create-product-uom.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({
    description:
      'Set to true when updating base_uom to confirm stock recount awareness.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  confirmUomChange?: boolean;

  @ApiPropertyOptional({
    description: 'Flag indicating manual stock recount request',
  })
  @IsOptional()
  @IsBoolean()
  needsRecount?: boolean;

  @ApiPropertyOptional({
    description: 'Array of alternate UoMs to synchronize for this product.',
    type: [CreateProductUomDto],
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateProductUomDto)
  uoms?: CreateProductUomDto[];
}
