import { ApiProperty } from '@nestjs/swagger';
import { StockMovementResponseDto } from './stock-movement-response.dto';
import { StockMovement, Product, StaffUser } from 'src/generated/prisma/client';

type StockMovementWithRelations = StockMovement & {
  product?: Product;
  staff?: StaffUser;
  approvedBy?: StaffUser | null;
};

export class PaginatedStockMovementsResponseDto {
  @ApiProperty({ type: [StockMovementResponseDto] })
  data!: StockMovementResponseDto[];

  @ApiProperty({ example: 150 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 8 })
  totalPages!: number;

  static fromEntities(
    entities: StockMovementWithRelations[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedStockMovementsResponseDto {
    return {
      data: entities.map((entity) =>
        StockMovementResponseDto.fromEntity(entity),
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
