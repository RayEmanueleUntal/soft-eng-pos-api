import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnitOfMeasure } from 'src/generated/prisma/client';

export class ProductUomResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 10 })
  productId!: number;

  @ApiProperty({ enum: UnitOfMeasure, example: UnitOfMeasure.BOX })
  uom!: UnitOfMeasure;

  @ApiProperty({
    example: 100.0,
    description: 'Conversion factor relative to Base UoM',
  })
  conversion_factor!: number;

  @ApiPropertyOptional({
    example: 450.0,
    description:
      'Explicit cost price override, or null if using calculated base cost * factor',
  })
  cost_price!: number | null;

  @ApiPropertyOptional({
    example: 600.0,
    description:
      'Explicit retail price override, or null if using calculated base retail * factor',
  })
  retail_price!: number | null;

  @ApiPropertyOptional({
    example: 550.0,
    description:
      'Explicit wholesale price override, or null if using calculated base wholesale * factor',
  })
  wholesale_price!: number | null;

  @ApiProperty({
    example: 450.0,
    description:
      'Effective cost price (explicit override if present, else computed from base cost * conversion_factor)',
  })
  calculated_cost_price!: number;

  @ApiProperty({
    example: 600.0,
    description:
      'Effective retail price (explicit override if present, else computed from base retail * conversion_factor)',
  })
  calculated_retail_price!: number;

  @ApiPropertyOptional({
    example: 550.0,
    description:
      'Effective wholesale price (explicit override if present, else computed from base wholesale * conversion_factor)',
  })
  calculated_wholesale_price!: number | null;

  @ApiProperty({ example: false })
  is_default_purchase!: boolean;

  @ApiProperty({ example: false })
  is_default_sales!: boolean;

  static fromEntity(
    entity: any,
    basePrices: {
      cost_price: number;
      retail_price: number;
      wholesale_price: number | null;
    },
  ): ProductUomResponseDto {
    const factor = Number(entity.conversion_factor);

    const explicitCost =
      entity.cost_price !== null && entity.cost_price !== undefined
        ? Number(entity.cost_price)
        : null;
    const explicitRetail =
      entity.retail_price !== null && entity.retail_price !== undefined
        ? Number(entity.retail_price)
        : null;
    const explicitWholesale =
      entity.wholesale_price !== null && entity.wholesale_price !== undefined
        ? Number(entity.wholesale_price)
        : null;

    const calculated_cost_price =
      explicitCost ?? Number((basePrices.cost_price * factor).toFixed(2));
    const calculated_retail_price =
      explicitRetail ?? Number((basePrices.retail_price * factor).toFixed(2));
    const calculated_wholesale_price =
      explicitWholesale ??
      (basePrices.wholesale_price !== null
        ? Number((basePrices.wholesale_price * factor).toFixed(2))
        : null);

    return {
      id: entity.id,
      productId: entity.productId,
      uom: entity.uom,
      conversion_factor: factor,
      cost_price: explicitCost,
      retail_price: explicitRetail,
      wholesale_price: explicitWholesale,
      calculated_cost_price,
      calculated_retail_price,
      calculated_wholesale_price,
      is_default_purchase: entity.is_default_purchase ?? false,
      is_default_sales: entity.is_default_sales ?? false,
    };
  }
}
