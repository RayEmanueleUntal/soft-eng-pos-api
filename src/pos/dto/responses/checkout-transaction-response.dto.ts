import { ApiProperty } from '@nestjs/swagger';
import { TransactionStatus, TransactionType } from 'src/generated/prisma/enums';
import { Transaction, TransactionItem } from 'src/generated/prisma/client';
import { TransactionItemResponseDto } from './transaction-item-response.dto';
import { PaymentResponseDto } from './payment-response.dto';

export class CheckoutTransactionResponseDto {
  @ApiProperty({
    example: 101,
    description: 'Unique primary key ID of the transaction',
  })
  id!: number;

  @ApiProperty({
    example: 42,
    nullable: true,
    description:
      'ID of the associated customer. Null for guest/walk-in retail transactions.',
  })
  customerId!: number | null;

  @ApiProperty({
    example: 7,
    description: 'ID of the staff/cashier member who processed the checkout',
  })
  staffId!: number;

  @ApiProperty({
    enum: TransactionType,
    example: TransactionType.RETAIL,
    description: 'Transaction classification (RETAIL or WHOLESALE)',
  })
  transaction_type!: TransactionType;

  @ApiProperty({
    example: 'INV-2026-0001',
    nullable: true,
    description: 'Generated auto-incrementing invoice serial number',
  })
  invoice_number!: string | null;

  @ApiProperty({
    example: '2026-08-27T11:00:00.000Z',
    description: 'Timestamp when the transaction was completed',
  })
  date!: Date;

  @ApiProperty({
    enum: TransactionStatus,
    example: TransactionStatus.COMPLETED,
    description: 'Current operational status of the transaction',
  })
  status!: TransactionStatus;

  @ApiProperty({
    example: 1500.0,
    description: 'Net subtotal amount before tax and discounts',
  })
  subtotal!: number;

  @ApiProperty({
    example: 0.0,
    description: 'Total tax amount applied to the transaction',
  })
  tax_total!: number;

  @ApiProperty({
    example: 100.0,
    description: 'Total combined line discounts applied',
  })
  discount_total!: number;

  @ApiProperty({
    example: 1400.0,
    description: 'Final grand total amount charged',
  })
  grand_total!: number;

  @ApiProperty({
    type: () => [TransactionItemResponseDto],
    description: 'List of line items included in this checkout transaction',
  })
  transaction_items!: TransactionItemResponseDto[];

  @ApiProperty({
    type: () => [PaymentResponseDto],
    description: 'List of payments involved for the transaction.',
  })
  payments!: PaymentResponseDto[];

  static fromEntities(
    transaction: Transaction & { payments?: any[] },
    transactionItems: TransactionItem[],
  ): CheckoutTransactionResponseDto {
    return {
      ...transaction,
      transaction_items: transactionItems.map(
        TransactionItemResponseDto.fromEntity,
      ),
      payments: (transaction.payments ?? []).map((p) => ({
        id: p.id,
        payment_method: p.payment_method,
        amount_paid: p.amount_paid.toNumber(),
        details: p.cashPayment ?? p.gCashPayment ?? p.creditPayment ?? null,
      })),
      subtotal: transaction.subtotal.toNumber(),
      tax_total: transaction.tax_total.toNumber(),
      discount_total: transaction.discount_total.toNumber(),
      grand_total: transaction.grand_total.toNumber(),
    };
  }
}
