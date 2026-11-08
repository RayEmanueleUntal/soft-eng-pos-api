import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory, PaymentMethod } from 'src/generated/prisma/enums';
import { Expense } from 'src/generated/prisma/client';

export class StaffUserSummaryDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'John' })
  first_name!: string;

  @ApiProperty({ example: 'Doe' })
  last_name!: string;
}

export class ExpenseResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ enum: ExpenseCategory, example: ExpenseCategory.UTILITIES })
  category!: ExpenseCategory;

  @ApiProperty({ example: 2500.5 })
  amount!: number;

  @ApiProperty({ example: '2026-03-31T10:00:00.000Z' })
  date!: Date;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  payment_method!: PaymentMethod;

  @ApiPropertyOptional({ example: 'Meralco bill for Oct', nullable: true })
  notes!: string | null;

  @ApiProperty({ example: 1 })
  staffId!: number;

  @ApiPropertyOptional({ type: StaffUserSummaryDto, nullable: true })
  staff?: StaffUserSummaryDto;

  @ApiProperty({ example: '2026-03-31T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-03-31T10:00:00.000Z' })
  updatedAt!: Date;

  /**
   * Sanitizes and transforms Prisma entity into ExpenseResponseDto
   */
  static fromEntity(
    entity: Expense & {
      staff?: { id: number; first_name: string; last_name: string };
    },
  ): ExpenseResponseDto {
    return {
      id: entity.id,
      category: entity.category,
      amount: Number(entity.amount),
      date: entity.date,
      payment_method: entity.payment_method,
      notes: entity.notes,
      staffId: entity.staffId,
      staff: entity.staff
        ? {
            id: entity.staff.id,
            first_name: entity.staff.first_name,
            last_name: entity.staff.last_name,
          }
        : undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
