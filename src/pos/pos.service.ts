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
  CustomerType,
  PaymentMethod,
  TransactionType,
  UnitOfMeasure,
} from 'src/generated/prisma/enums';
import { InsufficientCreditException } from 'src/common/exceptions/insufficient-credit.exception';
import { TransactionTypeMismatchException } from 'src/common/exceptions/transaction-type-mismatch.exception';
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

  /*
  Checkout items
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
      // 1. Fetch Customer & Wholesale account
      const customer = customerId
        ? await tx.customer.findUnique({
            where: { id: customerId },
            include: { wholesale: true },
          })
        : null;

      // 2. Validate Wholesale / Retail item constraints
      const hasWholesaleItems = items.some(
        (item) => item.transaction_type === TransactionType.WHOLESALE,
      );

      // If transaction type is wholesale, but there is not a single wholesale item,
      // or if there is a wholesale item in a retail transaction, raise exception
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

      // Ensure that only a wholesale customer can perform wholesale transactions
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

      // 3. Credit Payment Validation
      // Only wholesale customers can use credit
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

      // If the wholesale customer uses their credits, ensure that they have enough balance
      if (creditPaymentDto) {
        const creditLimit = customer!.wholesale!.credit_limit.toNumber();
        const currentBalance =
          customer!.wholesale!.outstanding_balance?.toNumber() ?? 0;
        const availableCredit = creditLimit - currentBalance;

        if (creditPaymentDto.amount_paid > availableCredit) {
          throw new InsufficientCreditException(
            customerId!,
            creditPaymentDto.amount_paid,
            availableCredit,
          );
        }
      }

      // 4. Fetch Products and Calculate Line Totals
      // Fetch products from the database to get their actual base prices and types
      const productIds = items.map((item) => item.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      // Create a lookup map
      const productMap = new Map(products.map((p) => [p.id, p]));

      let subtotal = new Prisma.Decimal(0);
      let discountTotal = new Prisma.Decimal(0);

      const transactionItemsData = items.map((itemDto) => {
        const product = productMap.get(itemDto.productId);
        if (!product) {
          throw new NotFoundException(
            `Product with ID ${itemDto.productId} not found.`,
          );
        }

        // Determine unit price based on whether the item is retail or wholesale
        const unitPrice = new Prisma.Decimal(
          itemDto.transaction_type === TransactionType.WHOLESALE
            ? Number(product?.wholesale_price)
            : Number(product?.retail_price),
        );

        const quantity = new Prisma.Decimal(itemDto.quantity_sold);
        const discount = new Prisma.Decimal(itemDto.line_discount ?? 0);

        // Calculate line item subtotal: (quantity x unit_price) - discount
        const lineSubtotal = quantity.times(unitPrice);
        subtotal = subtotal.plus(lineSubtotal);
        discountTotal = discountTotal.plus(discount);

        return {
          productId: itemDto.productId,
          quantity_sold: quantity,
          unit_of_measure: product?.pricing_uom ?? UnitOfMeasure.PCS, // fallback unit
          unit_price: unitPrice,
          discount: discount,
          subtotal: lineSubtotal.minus(discount), // Net line item total
        };
      });

      // TODO: NEED CONFIRMATION. MIGHT ADD TAX LOGIC.
      // Philippine BIR context: Determine if retail prices are VAT-inclusive (default)
      // and wholesale prices are VAT-exclusive, or if the business is non-VAT.

      // 5. Calculate Final Transaction Totals
      const taxTotal = new Prisma.Decimal(0); // tax placeholder

      // Calculate grand total
      const grandTotal = subtotal.minus(discountTotal).plus(taxTotal);

      // Calculate total paid
      const totalPaid = payments.reduce(
        (acc, p) => acc.plus(new Prisma.Decimal(p.amount_paid)),
        new Prisma.Decimal(0),
      );

      // Total validation check
      if (totalPaid.lessThan(grandTotal)) {
        throw new BadRequestException(
          `Insufficient payment. Total: ${grandTotal.toFixed(2)}, Paid: ${totalPaid.toFixed(2)}`,
        );
      }

      // 6. Generate Serial Invoice Number
      const invoice_number =
        await this.transactionsService.getNextInvoiceNumber(tx);

      // 7. Deduct Inventory Stock
      // Verify and adjust products stock in real-time
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

      // 8. Construct Nested Polymorphic Payment Mutations
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

      // 9. Update Wholesale Account Outstanding Balance
      if (creditPaymentDto && customer?.wholesale) {
        await this.customersService.adjustWholesaleBalance(
          tx,
          customerId!,
          creditPaymentDto.amount_paid,
        );
      }

      // 10. Persist Transaction, Items, and Payments
      // POS prepares the data, TransactionService writes it.

      // const newTransaction = await tx.transaction.create({
      //   data: {
      //     invoice_number,
      //     transaction_type,
      //     customerId: customerId ?? null,
      //     staffId: userId,
      //     subtotal: subtotal,
      //     tax_total: taxTotal,
      //     discount_total: discountTotal,
      //     grand_total: grandTotal,
      //     transactionItems: {
      //       create: transactionItemsData,
      //     },
      //     payments: {
      //       create: paymentsCreateData,
      //     },
      //   },
      //   include: {
      //     transactionItems: true,
      //     payments: {
      //       include: {
      //         cashPayment: true,
      //         gCashPayment: true,
      //         creditPayment: true,
      //       },
      //     },
      //   },
      // });

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
