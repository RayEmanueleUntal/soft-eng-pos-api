import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory, PaymentMethod } from 'src/generated/prisma/enums';

export class CategoryBreakdownItemDto {
  @ApiProperty({
    description: 'Expense category enum',
    enum: ExpenseCategory,
    example: 'RENT',
  })
  category!: ExpenseCategory;

  @ApiProperty({
    description: 'Total monetary amount spent in this category',
    example: 25000.0,
  })
  total_amount!: number;

  @ApiProperty({
    description: 'Total number of expense logs in this category',
    example: 3,
  })
  log_count!: number;

  @ApiProperty({
    description: 'Percentage share of total operational expenses',
    example: 45.5,
  })
  percentage_share!: number;
}

export class ExpenseStaffResponseDto {
  @ApiProperty({ description: 'Staff user ID', example: 2 })
  id!: number;

  @ApiProperty({ description: 'Staff username', example: 'admin_user' })
  username!: string;

  @ApiProperty({ description: 'Staff full name', example: 'Juan Dela Cruz' })
  full_name!: string;
}

export class ExpenseListItemDto {
  @ApiProperty({ description: 'Expense record ID', example: 10 })
  id!: number;

  @ApiProperty({
    description: 'Date expense occurred',
    example: '2026-03-15T10:30:00.000Z',
  })
  date!: Date;

  @ApiProperty({
    description: 'Expense category',
    enum: ExpenseCategory,
    example: 'UTILITIES',
  })
  category!: ExpenseCategory;

  @ApiProperty({
    description: 'Payment method used',
    enum: PaymentMethod,
    example: 'CASH',
  })
  payment_method!: PaymentMethod;

  @ApiProperty({ description: 'Expense monetary amount', example: 4500.0 })
  amount!: number;

  @ApiPropertyOptional({
    description: 'Notes or detailed description',
    example: 'Meralco bill for March 2026',
  })
  notes!: string | null;

  @ApiProperty({
    description: 'Staff details who recorded the expense',
    type: ExpenseStaffResponseDto,
  })
  staff!: ExpenseStaffResponseDto;
}

export class ExpensePaginationMetaDto {
  @ApiProperty({
    description: 'Total count of expense items matching filters',
    example: 45,
  })
  total_count!: number;

  @ApiProperty({ description: 'Total available pages', example: 5 })
  total_pages!: number;

  @ApiProperty({ description: 'Current active page', example: 1 })
  current_page!: number;

  @ApiProperty({ description: 'Items per page limit', example: 10 })
  limit!: number;
}

export class ExpenseAnalyticsResponseDto {
  @ApiProperty({
    description: 'Grand total of operational expenses in selected date range',
    example: 54800.0,
  })
  total_opex!: number;

  @ApiProperty({
    type: [CategoryBreakdownItemDto],
    description: 'Visual spending distribution by category',
  })
  category_breakdown!: CategoryBreakdownItemDto[];

  @ApiProperty({
    type: [ExpenseListItemDto],
    description: 'Detailed expense line items table',
  })
  expense_list!: ExpenseListItemDto[];

  @ApiProperty({
    type: ExpensePaginationMetaDto,
    description: 'Pagination metadata for expense list table',
  })
  pagination!: ExpensePaginationMetaDto;
}
