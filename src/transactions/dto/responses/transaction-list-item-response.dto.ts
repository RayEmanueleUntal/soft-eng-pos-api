import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionStatus, TransactionType } from 'src/generated/prisma/enums';
import { ReceiptCustomerDto } from './receipt/receipt-customer.dto';
import { ReceiptExchangeDto } from './receipt/receipt-exchange.dto';
import { ReceiptItemDto } from './receipt/receipt-item.dto';
import { ReceiptPaymentDto } from './receipt/receipt-payment.dto';
import { ReceiptReturnDto } from './receipt/receipt-return.dto';
import { ReceiptShipmentDto } from './receipt/receipt-shipment.dto';

export class TransactionListItemResponseDto {
  @ApiProperty({
    example: 101,
    description: 'Unique transaction primary key ID',
  })
  id!: number;

  @ApiProperty({
    example: 'INV-2026-0001',
    nullable: true,
    description: 'Official receipt invoice number',
  })
  invoice_number!: string | null;

  @ApiProperty({ example: '2026-08-28T00:00:00.000Z' })
  date!: Date;

  @ApiProperty({
    enum: TransactionStatus,
    example: TransactionStatus.COMPLETED,
  })
  status!: TransactionStatus;

  @ApiProperty({ enum: TransactionType, example: TransactionType.RETAIL })
  transaction_type!: TransactionType;

  @ApiProperty({ example: 300.0, description: 'Subtotal before tax/discount' })
  subtotal!: number;

  @ApiProperty({ example: 36.0, description: 'Total tax amount' })
  tax_total!: number;

  @ApiProperty({ example: 0.0, description: 'Total discount amount' })
  discount_total!: number;

  @ApiProperty({ example: 336.0, description: 'Final grand total amount' })
  grand_total!: number;

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

  @ApiPropertyOptional({
    type: [ReceiptShipmentDto],
    description: 'Logistics and delivery records associated with transaction',
  })
  shipments?: ReceiptShipmentDto[];

  @ApiPropertyOptional({
    type: [ReceiptReturnDto],
    description: 'Return records linked to this invoice',
  })
  returns?: ReceiptReturnDto[];

  @ApiPropertyOptional({
    type: [ReceiptExchangeDto],
    description: 'Product exchange records linked to this invoice',
  })
  exchanges?: ReceiptExchangeDto[];

  static fromEntity(entity: any): TransactionListItemResponseDto {
    const returnsList = entity.returns ?? [];

    return {
      id: entity.id,
      invoice_number: entity.invoice_number,
      date: entity.date,
      status: entity.status,
      transaction_type: entity.transaction_type,
      subtotal: entity.subtotal.toNumber(),
      tax_total: entity.tax_total.toNumber(),
      discount_total: entity.discount_total.toNumber(),
      grand_total: entity.grand_total.toNumber(),
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

        const returnedQtyForProduct = returnsList
          .filter((r: any) => r.productId === item.productId)
          .reduce((sum: number, r: any) => sum + r.quantity.toNumber(), 0);

        return {
          productId: item.productId,
          product_name: item.product?.name ?? 'Unknown Product',
          quantity: qty,
          applied_price: unitPrice,
          subtotal: lineSubtotal,
          discounted_price: lineSubtotal - discount,
          net_price: item.subtotal.toNumber(),
          pricing_uom: item.unit_of_measure,
          type: entity.transaction_type,
          already_returned_qty: returnedQtyForProduct,
        };
      }),
      payments: (entity.payments ?? []).map((p: any) => ({
        payment_method: p.payment_method,
        amount_paid: p.amount_paid.toNumber(),
        cash_tendered: p.cashPayment?.cash_tendered?.toNumber(),
        change_given: p.cashPayment?.change_given?.toNumber(),
        reference_number: p.gCashPayment?.reference_number,
        gcash_mobile_number: p.gCashPayment?.gcash_mobile_number,
        due_date: p.creditPayment?.due_date,
        remaining_credit_balance:
          p.creditPayment?.remaining_credit_balance?.toNumber(),
      })),
      ...(entity.shipments && {
        shipments: entity.shipments.map((s: any) => ({
          id: s.id,
          forwarder_name: s.forwarder?.name ?? 'Unknown Forwarder',
          dispatch_date: s.dispatch_date,
          tracking_status: s.tracking_status,
        })),
      }),
      ...(entity.returns && {
        returns: returnsList.map((r: any) => ({
          id: r.id,
          productId: r.productId,
          product_name: r.product?.name ?? 'Unknown Product',
          quantity: r.quantity.toNumber(),
          date: r.date,
          defect_reason: r.defect_reason,
          refund_amount: r.refund_amount.toNumber(),
          processed_by_staff:
            r.staff?.name ?? r.staff?.username ?? 'Unknown Staff',
        })),
      }),
      ...(entity.exchanges && {
        exchanges: (entity.exchanges ?? []).map((e: any) => ({
          id: e.id,
          productId: e.productId,
          product_name: e.product?.name ?? 'Unknown Product',
          quantity: e.quantity.toNumber(),
          date: e.date,
          price_difference: e.price_difference.toNumber(),
          is_within_7_days: e.is_within_7_days,
        })),
      }),
    };
  }
}
