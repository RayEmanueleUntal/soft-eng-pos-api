import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionStatus, TransactionType } from 'src/generated/prisma/enums';
import { ReceiptCustomerDto } from './receipt-customer.dto';
import { ReceiptItemDto } from './receipt-item.dto';
import { ReceiptPaymentDto } from './receipt-payment.dto';
import { ReceiptShipmentDto } from './receipt-shipment.dto';
import { ReceiptReturnDto } from './receipt-return.dto';
import { ReceiptExchangeDto } from './receipt-exchange.dto';

export class GetReceiptResponseDto {
  @ApiProperty({ description: 'Transaction ID', example: 1001 })
  transactionId!: number;

  @ApiPropertyOptional({
    description: 'Formatted Invoice Number',
    example: 'INV-2026-0001',
    nullable: true,
  })
  invoice_number!: string | null;

  @ApiProperty({ description: 'Date and time of transaction' })
  date!: Date;

  @ApiProperty({
    description: 'Status of transaction',
    enum: TransactionStatus,
  })
  status!: TransactionStatus;

  @ApiProperty({
    description: 'Type of transaction',
    enum: TransactionType,
  })
  transaction_type!: TransactionType;

  @ApiProperty({
    description: 'Subtotal before tax and discount',
    example: 1000.0,
  })
  subtotal!: number;

  @ApiProperty({ description: 'Tax amount total', example: 120.0 })
  tax_total!: number;

  @ApiProperty({ description: 'Discount amount total', example: 50.0 })
  discount_total!: number;

  @ApiProperty({
    description: 'Grand total transaction price',
    example: 1070.0,
  })
  grand_total!: number;

  @ApiProperty({
    description: 'Full name of cashier / staff member',
    example: 'John Doe',
  })
  cashier_name!: string;

  @ApiPropertyOptional({ type: () => ReceiptCustomerDto, nullable: true })
  customer!: ReceiptCustomerDto | null;

  @ApiProperty({ type: () => [ReceiptItemDto] })
  items!: ReceiptItemDto[];

  @ApiProperty({ type: () => [ReceiptPaymentDto] })
  payments!: ReceiptPaymentDto[];

  @ApiPropertyOptional({ type: () => [ReceiptShipmentDto] })
  shipments?: ReceiptShipmentDto[];

  @ApiPropertyOptional({ type: () => [ReceiptReturnDto] })
  returns?: ReceiptReturnDto[];

  @ApiPropertyOptional({ type: () => [ReceiptExchangeDto] })
  exchanges?: ReceiptExchangeDto[];

  static fromEntity(entity: any): GetReceiptResponseDto {
    const dto = new GetReceiptResponseDto();
    dto.transactionId = entity.id;
    dto.invoice_number = entity.invoice_number;
    dto.date = entity.date;
    dto.status = entity.status;
    dto.transaction_type = entity.transaction_type;
    dto.subtotal = Number(entity.subtotal);
    dto.tax_total = Number(entity.tax_total);
    dto.discount_total = Number(entity.discount_total);
    dto.grand_total = Number(entity.grand_total);
    dto.cashier_name = entity.staff
      ? `${entity.staff.first_name ?? ''} ${entity.staff.last_name ?? ''}`.trim()
      : 'Unknown Staff';

    dto.customer = entity.customer
      ? {
          name: entity.customer.name,
          number: entity.customer.contact_number,
        }
      : null;

    dto.items = (entity.transactionItems || []).map((item: any) =>
      ReceiptItemDto.fromEntity(item),
    );

    dto.payments = (entity.payments || []).map((p: any) => ({
      payment_method: p.payment_method,
      amount_paid: Number(p.amount_paid),
      cash_tendered: p.cashPayment
        ? Number(p.cashPayment.cash_tendered)
        : undefined,
      change_given: p.cashPayment
        ? Number(p.cashPayment.change_given)
        : undefined,
      reference_number: p.gCashPayment?.reference_number,
      gcash_mobile_number: p.gCashPayment?.gcash_mobile_number,
      due_date: p.creditPayment?.due_date,
      remaining_credit_balance: p.creditPayment
        ? Number(p.creditPayment.remaining_credit_balance)
        : undefined,
    }));

    if (entity.shipments) {
      dto.shipments = entity.shipments.map((s: any) => ({
        id: s.id,
        forwarder_name: s.forwarder?.company_name ?? 'N/A',
        dispatch_date: s.dispatch_date,
        tracking_status: s.tracking_status,
      }));
    }

    if (entity.returns) {
      dto.returns = entity.returns.map((r: any) => ({
        id: r.id,
        productId: r.productId,
        product_name: r.product?.name ?? 'Unknown',
        quantity: Number(r.quantity),
        date: r.date,
        defect_reason: r.defect_reason,
        refund_amount: Number(r.refund_amount),
        processed_by_staff: r.staff
          ? `${r.staff.first_name ?? ''} ${r.staff.last_name ?? ''}`.trim()
          : 'Unknown Staff',
      }));
    }

    if (entity.exchanges) {
      dto.exchanges = entity.exchanges.map((e: any) => ({
        id: e.id,
        productId: e.productId,
        product_name: e.product?.name ?? 'Unknown',
        quantity: Number(e.quantity),
        date: e.date,
        price_difference: Number(e.price_difference),
        is_within_7_days: e.is_within_7_days,
      }));
    }

    return dto;
  }
}
