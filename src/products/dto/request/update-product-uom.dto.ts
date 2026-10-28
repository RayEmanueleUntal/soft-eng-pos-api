import { PartialType } from '@nestjs/swagger';
import { CreateProductUomDto } from './create-product-uom.dto';

export class UpdateProductUomDto extends PartialType(CreateProductUomDto) {}
