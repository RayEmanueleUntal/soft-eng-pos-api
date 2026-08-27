import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from 'src/generated/prisma/enums';
import { ReceiptCustomerDto } from './receipt-customer.dto';
import { ReceiptItemDto } from './receipt-item.dto';
import { ReceiptPaymentDto } from './receipt-payment.dto';

export class GetReceiptResponseDto {
  @ApiProperty({
    example: 101,
    description: 'Unique transaction primary key ID',
  })
  transactionId!: number;

  @ApiProperty({
    example: 'INV-2026-0001',
    nullable: true,
    description: 'Official receipt invoice number',
  })
  invoice_number!: string | null;

  @ApiProperty({ example: '2026-08-28T00:00:00.000Z' })
  date!: Date;

  @ApiProperty({ example: 360.0, description: 'Final grand total amount paid' })
  grand_total!: number;

  @ApiProperty({ enum: TransactionType, example: TransactionType.RETAIL })
  transaction_type!: TransactionType;

  @ApiProperty({
    example: 'Maria Santos',
    description: 'Name of cashier staff who processed order',
  })
  cashier_name!: string;

  @ApiPropertyOptional({ type: ReceiptCustomerDto, nullable: true })
  customer!: ReceiptCustomerDto | null;

  @ApiProperty({ type: [ReceiptItemDto] })
  items!: ReceiptItemDto[];

  @ApiProperty({ type: [ReceiptPaymentDto] })
  payments!: ReceiptPaymentDto[];

  /**
   * Transforms raw Prisma transaction entity (with relations) into presentation-safe DTO
   */
  static fromEntity(entity: any): GetReceiptResponseDto {
    return {
      transactionId: entity.id,
      invoice_number: entity.invoice_number,
      date: entity.date,
      grand_total: entity.grand_total.toNumber(),
      transaction_type: entity.transaction_type,
      cashier_name:
        entity.staff?.name ?? entity.staff?.username ?? 'Unknown Cashier',
      customer: entity.customer
        ? {
            name: entity.customer.name,
            number: entity.customer.phone ?? entity.customer.number ?? '',
          }
        : null,
      items: (entity.transactionItems ?? []).map((item: any) => {
        const unitPrice = item.unit_price.toNumber();
        const qty = item.quantity_sold.toNumber();
        const discount = item.discount.toNumber();
        const lineSubtotal = unitPrice * qty;

        return {
          product_name: item.product?.name ?? 'Unknown Product',
          quantity: qty,
          applied_price: unitPrice,
          subtotal: lineSubtotal,
          discounted_price: lineSubtotal - discount,
          net_price: item.subtotal.toNumber(),
          type: item.transaction_type ?? entity.transaction_type,
        };
      }),
      payments: (entity.payments ?? []).map((p: any) => ({
        payment_method: p.payment_method,
        amount_paid: p.amount_paid.toNumber(),
        cash_tendered: p.cashPayment?.cash_tendered?.toNumber(),
        change_given: p.cashPayment?.change_given?.toNumber(),
        reference_number: p.gCashPayment?.reference_number,
      })),
    };
  }
}
