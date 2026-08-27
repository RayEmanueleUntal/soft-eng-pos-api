import { TransactionStatus, TransactionType } from 'src/generated/prisma/enums';
import { TransactionItemResponseDto } from './transaction-item-response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Transaction, TransactionItem } from 'src/generated/prisma/client';

export class CheckoutTransactionResponseDto {
  @ApiProperty({})
  customerId!: number | null;

  staffId!: number;

  transaction_type!: TransactionType;

  id!: number;

  invoice_number!: string | null;

  date!: Date;

  status!: TransactionStatus;

  subtotal!: number;

  tax_total!: number;

  discount_total!: number;

  grand_total!: number;

  transaction_items!: TransactionItemResponseDto[];

  static fromEntities(
    transaction: Transaction,
    transactionItems: TransactionItem[],
  ): CheckoutTransactionResponseDto {
    return {
      ...transaction,
      transaction_items: transactionItems.map(
        TransactionItemResponseDto.fromEntity,
      ),
      subtotal: transaction.subtotal.toNumber(),
      tax_total: transaction.tax_total.toNumber(),
      discount_total: transaction.discount_total.toNumber(),
      grand_total: transaction.grand_total.toNumber(),
    };
  }
}
