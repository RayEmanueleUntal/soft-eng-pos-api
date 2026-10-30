// src/pos/pos.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CashDetailsDto,
  CheckoutDto,
  CheckoutTransactionResponseDto,
  CreditDetailsDto,
  GCashDetailsDto,
} from './dto';
import {
  CreditStatus,
  CustomerType,
  PaymentMethod,
  TransactionType,
  UnitOfMeasure,
} from 'src/generated/prisma/enums';
import {
  InsufficientCreditException,
  OverdueCreditException,
  TransactionTypeMismatchException,
} from 'src/common/exceptions';
import { Prisma } from 'src/generated/prisma/client';
import { InventoryService } from 'src/inventory/inventory.service';
import { TransactionsService } from 'src/transactions/transactions.service';
import { CustomersService } from 'src/customers/customers.service';

@Injectable()
export class PosService {
  private readonly logger = new Logger(PosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly transactionsService: TransactionsService,
    private readonly customersService: CustomersService,
  ) {}

  /**
   * Process POS Sales Checkout
   * Handles stock deduction, WAC cost snapshotting, UOM conversions, and wholesale credit rules.
   */
  async checkout(
    userId: number,
    checkoutDto: CheckoutDto,
  ): Promise<CheckoutTransactionResponseDto> {
    const { customerId, items, payments } = checkoutDto;
    const transaction_type =
      checkoutDto.transaction_type ?? TransactionType.RETAIL;
    this.logger.log('Checking Out', { checkout: checkoutDto });

    return await this.prisma.$transaction(async (tx) => {
      // ------------------------------------------------------------------------
      // 1. Fetch Customer & Wholesale Profile
      // ------------------------------------------------------------------------
      const customer = customerId
        ? await tx.customer.findUnique({
            where: { id: customerId },
            include: { wholesale: true },
          })
        : null;

      // ------------------------------------------------------------------------
      // 2. Validate Wholesale / Retail Item & Customer Constraints
      // ------------------------------------------------------------------------
      const hasWholesaleItems = items.some(
        (item) => item.transaction_type === TransactionType.WHOLESALE,
      );

      if (transaction_type === TransactionType.RETAIL && hasWholesaleItems) {
        this.logger.warn(
          `Checkout failed. Cannot process a Retail transaction containing wholesale items.`,
        );
        throw new TransactionTypeMismatchException(
          'Cannot process a Retail transaction containing wholesale items.',
        );
      }

      if (
        transaction_type === TransactionType.WHOLESALE &&
        !hasWholesaleItems
      ) {
        this.logger.warn(
          `Checkout failed. A Wholesale transaction must contain at least one wholesale item.`,
        );
        throw new TransactionTypeMismatchException(
          'A Wholesale transaction must contain at least one wholesale item.',
        );
      }

      if (
        transaction_type === TransactionType.WHOLESALE &&
        (!customerId || customer?.type !== CustomerType.WHOLESALE)
      ) {
        this.logger.warn(
          `Checkout failed. Customer must be a wholesale customer to perform wholesale transaction.`,
        );
        throw new ForbiddenException(
          'Customer must be a wholesale customer to perform wholesale transaction.',
        );
      }

      // ------------------------------------------------------------------------
      // 3. Wholesale Credit Line & Overdue Checks
      // ------------------------------------------------------------------------
      const creditPaymentDto = payments.find(
        (payment) => payment.payment_method === PaymentMethod.CREDIT,
      );

      if (
        creditPaymentDto &&
        (!customer || customer.type !== CustomerType.WHOLESALE)
      ) {
        this.logger.warn(
          `Checkout failed. Customer must be a wholesale customer to use credits as payment.`,
        );
        throw new ForbiddenException(
          'Customer must be a wholesale customer to use credits as payment.',
        );
      }

      if (creditPaymentDto && customer?.wholesale) {
        const creditLimit = customer.wholesale.credit_limit.toNumber();
        const currentBalance =
          customer.wholesale.outstanding_balance?.toNumber() ?? 0;
        const requestedCredit = Number(creditPaymentDto.amount_paid);

        // A. Credit Limit Enforcement: (balance + new_credit <= limit)
        if (currentBalance + requestedCredit > creditLimit) {
          const availableCredit = creditLimit - currentBalance;
          this.logger.warn(
            `Checkout failed: Credit limit exceeded for Customer #${customerId}. Limit: ${creditLimit}, Current Balance: ${currentBalance}, Requested: ${requestedCredit}`,
          );
          throw new InsufficientCreditException(
            customerId!,
            requestedCredit,
            availableCredit,
          );
        }

        // B. Check for Overdue Credit Payments
        const now = new Date();
        const overdueRecords = await tx.creditPayment.findMany({
          where: {
            payment: {
              transaction: {
                customerId: customerId!,
              },
            },
            OR: [
              { status: CreditStatus.OVERDUE },
              {
                status: {
                  in: [CreditStatus.UNPAID, CreditStatus.PARTIALLY_PAID],
                },
                due_date: { lt: now },
              },
            ],
          },
          select: {
            remaining_credit_balance: true,
          },
        });

        if (overdueRecords.length > 0) {
          const totalOverdueAmount = overdueRecords.reduce(
            (sum, item) => sum + Number(item.remaining_credit_balance),
            0,
          );

          // Allow proceed ONLY IF the cashier explicitly supplied override flag
          if (!checkoutDto.override) {
            this.logger.warn(
              `Checkout blocked: Customer #${customerId} has ${overdueRecords.length} overdue invoice(s) totalling ₱${totalOverdueAmount.toFixed(2)}. Override not set.`,
            );
            throw new OverdueCreditException(
              customerId!,
              overdueRecords.length,
              totalOverdueAmount,
            );
          }

          this.logger.warn(
            `CREDIT OVERRIDE APPLIED: Customer #${customerId} allowed credit checkout despite ${overdueRecords.length} overdue invoice(s). Authorized by User #${userId}`,
          );
        }
      }

      // ------------------------------------------------------------------------
      // 4. Fetch Products & Configured Product UOMs for Conversion Factors
      // ------------------------------------------------------------------------
      const productIds = items.map((item) => item.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        include: { uoms: true },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      let subtotal = new Prisma.Decimal(0);
      let discountTotal = new Prisma.Decimal(0);

      // ------------------------------------------------------------------------
      // 5. Calculate Line Totals, UOM Conversions & Snapshot WAC Cost Price
      // ------------------------------------------------------------------------
      const transactionItemsData = items.map((itemDto) => {
        const product = productMap.get(itemDto.productId);
        if (!product) {
          throw new NotFoundException(
            `Product with ID ${itemDto.productId} not found.`,
          );
        }

        const requestedUom = itemDto.current_uom ?? product.base_uom;

        // Resolve conversion factor: 1.000 if Base UOM, else lookup from ProductUom table
        let conversionFactor = new Prisma.Decimal(1.0);
        if (requestedUom !== product.base_uom) {
          const configuredUom = product.uoms.find(
            (u) => u.uom === requestedUom,
          );
          if (configuredUom) {
            conversionFactor = new Prisma.Decimal(
              configuredUom.conversion_factor,
            );
          }
        }

        // Calculate converted base quantity deducted: quantity_sold * conversion_factor
        const quantitySold = new Prisma.Decimal(itemDto.quantity_sold);
        const baseQuantityDeducted = quantitySold.times(conversionFactor);

        // Determine selling unit price based on retail vs wholesale item selection
        const unitPrice = new Prisma.Decimal(
          itemDto.transaction_type === TransactionType.WHOLESALE
            ? Number(product.wholesale_price ?? product.retail_price)
            : Number(product.retail_price),
        );

        // Snapshot Weighted Average Cost (WAC) per Base UOM from Product model
        const costPriceSnapshot = new Prisma.Decimal(product.cost_price);

        const discount = new Prisma.Decimal(itemDto.line_discount ?? 0);
        const lineSubtotal = quantitySold.times(unitPrice);

        subtotal = subtotal.plus(lineSubtotal);
        discountTotal = discountTotal.plus(discount);

        return {
          productId: itemDto.productId,
          quantity_sold: quantitySold,
          unit_of_measure: requestedUom,
          uom_conversion_factor: conversionFactor,
          base_quantity_deducted: baseQuantityDeducted,
          unit_price: unitPrice,
          cost_price: costPriceSnapshot, // Snapshot WAC at moment of sale
          discount: discount,
          subtotal: lineSubtotal.minus(discount),
        };
      });

      // ------------------------------------------------------------------------
      // 6. Calculate Final Transaction Totals & Payment Validation
      // ------------------------------------------------------------------------
      const taxTotal = new Prisma.Decimal(0); // Tax placeholder
      const grandTotal = subtotal.minus(discountTotal).plus(taxTotal);

      const totalPaid = payments.reduce(
        (acc, p) => acc.plus(new Prisma.Decimal(p.amount_paid)),
        new Prisma.Decimal(0),
      );

      if (totalPaid.lessThan(grandTotal)) {
        throw new BadRequestException(
          `Insufficient payment. Total: ${grandTotal.toFixed(2)}, Paid: ${totalPaid.toFixed(2)}`,
        );
      }

      // ------------------------------------------------------------------------
      // 7. Generate Invoice Number & Deduct Inventory Stock
      // ------------------------------------------------------------------------
      const invoice_number =
        await this.transactionsService.getNextInvoiceNumber(tx);

      for (const item of items) {
        await this.inventoryService.reduceProductStock(tx, {
          productId: item.productId,
          quantityToDeduct: item.quantity_sold,
          provided_uom: item.current_uom,
          userId,
          reason: `POS Sale (Invoice: ${invoice_number})`,
          allowOverride: checkoutDto.override ?? false,
          operation_name: 'Sales',
        });
      }

      // ------------------------------------------------------------------------
      // 8. Construct Polymorphic Payment Mutations
      // ------------------------------------------------------------------------
      const paymentsCreateData = payments.map((p) => {
        const basePaymentData: Prisma.PaymentCreateWithoutTransactionInput = {
          amount_paid: p.amount_paid,
          payment_method: p.payment_method,
        };

        if (p.payment_method === PaymentMethod.CASH && p.details) {
          const details = p.details as CashDetailsDto;
          basePaymentData.cashPayment = {
            create: {
              cash_tendered: details.cash_tendered,
              change_given: details.change_given,
            },
          };
        } else if (p.payment_method === PaymentMethod.GCASH && p.details) {
          const details = p.details as GCashDetailsDto;
          basePaymentData.gCashPayment = {
            create: {
              reference_number: details.reference_number,
              gcash_mobile_number: details.gcash_mobile_number ?? '',
            },
          };
        } else if (p.payment_method === PaymentMethod.CREDIT && p.details) {
          const details = p.details as CreditDetailsDto;
          const creditAmount = new Prisma.Decimal(p.amount_paid);

          basePaymentData.creditPayment = {
            create: {
              due_date: details.date ?? new Date(),
              remaining_credit_balance: creditAmount,
            },
          };
        }

        return basePaymentData;
      });

      // ------------------------------------------------------------------------
      // 9. Update Wholesale Account Outstanding Balance
      // ------------------------------------------------------------------------
      if (creditPaymentDto && customer?.wholesale) {
        await this.customersService.adjustWholesaleBalance(
          tx,
          customerId!,
          creditPaymentDto.amount_paid,
        );
      }

      // ------------------------------------------------------------------------
      // 10. Persist Transaction
      // ------------------------------------------------------------------------
      const newTransaction = await this.transactionsService.createTransaction(
        tx,
        {
          invoice_number,
          transaction_type,
          customerId: customerId ?? null,
          staffId: userId,
          subtotal,
          tax_total: taxTotal,
          discount_total: discountTotal,
          grand_total: grandTotal,
          transactionItems: { create: transactionItemsData },
          payments: { create: paymentsCreateData },
        },
      );

      return CheckoutTransactionResponseDto.fromEntities(
        newTransaction,
        newTransaction.transactionItems,
      );
    });
  }
}
