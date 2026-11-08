import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsDateString,
} from 'class-validator';
import { ExpenseCategory, PaymentMethod } from 'src/generated/prisma/enums';

export class CreateExpenseDto {
  @ApiProperty({
    description: 'Category of the operational expense',
    enum: ExpenseCategory,
    example: ExpenseCategory.UTILITIES,
  })
  @IsEnum(ExpenseCategory)
  @IsNotEmpty()
  category!: ExpenseCategory;

  @ApiProperty({
    description: 'Monetary amount for the expense (must be greater than 0)',
    example: 2500.5,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsNotEmpty()
  amount!: number;

  @ApiPropertyOptional({
    description: 'Payment method utilized for this expense',
    enum: PaymentMethod,
    default: PaymentMethod.CASH,
    example: PaymentMethod.CASH,
  })
  @IsEnum(PaymentMethod)
  @IsOptional()
  payment_method?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Date and time when the expense occurred',
    example: '2026-03-31T10:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({
    description: 'Detailed description or notes (e.g., Meralco bill for Oct)',
    example: 'Electricity bill payment for main store location',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
