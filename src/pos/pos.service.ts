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
  GetProductsDto,
  GetReceiptResponseDto,
  PaginatedProductsResponseDto,
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

@Injectable()
export class PosService {
  private readonly logger = new Logger(PosService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  /*
  Get a list of products based on the query
  */
  async getProducts(
    productsDto: GetProductsDto,
  ): Promise<PaginatedProductsResponseDto> {
    const {
      search,
      categoryId,
      size,
      thread,
      material,
      page = 1,
      limit = 15,
    } = productsDto;

    this.logger.debug('Fetching products list', { filters: productsDto });
    const searchKeywords = search ? search.trim().split(/\s+/) : [];

    const where: any = {};

    if (searchKeywords.length > 0) {
      // Every keyword typed must match AT LEAST ONE of the searchable fields
      where.AND = searchKeywords.map((keyword) => ({
        OR: [
          { name: { contains: keyword, mode: 'insensitive' } },
          { sku: { contains: keyword, mode: 'insensitive' } },
          { size_dimensions: { contains: keyword, mode: 'insensitive' } },
          { thread_type: { contains: keyword, mode: 'insensitive' } },
          { material_grade: { contains: keyword, mode: 'insensitive' } },
        ],
      }));
    }

    // B. Keep explicit filters if they are provided via dropdowns
    if (categoryId) where.categoryId = categoryId;
    if (size) {
      where.size_dimensions = { contains: size, mode: 'insensitive' };
    }
    if (thread) {
      where.thread_type = { contains: thread, mode: 'insensitive' };
    }
    if (material) {
      where.material_grade = { contains: material, mode: 'insensitive' };
    }

    const skip = (page - 1) * limit;

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { bin_location: true },
      }),
      this.prisma.product.count({ where }),
    ]);

    return PaginatedProductsResponseDto.fromEntities(
      products,
      total,
      page,
      limit,
    );
  }

  // Helper function: generating invoice number
  private async getNextInvoiceNumber(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const year = new Date().getFullYear();

    // ATOMIC: PostgreSQL increments and returns the next value in a single lock-free operation
    const result = await tx.$queryRaw<{ nextval: bigint }[]>`
    SELECT nextval('invoice_number_seq')
  `;

    const seq = Number(result[0].nextval);
    const paddedSequence = String(seq).padStart(4, '0');

    return `INV-${year}-${paddedSequence}`;
  }

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
      const invoice_number = await this.getNextInvoiceNumber(tx);

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
        const creditAmountUsed = new Prisma.Decimal(
          creditPaymentDto.amount_paid,
        );
        await tx.wholeSaleCustomer.update({
          where: { customerId: customer.wholesale.customerId },
          data: {
            outstanding_balance: {
              increment: creditAmountUsed,
            },
          },
        });
      }

      // 10. Persist Transaction, Items, and Payments
      // Create the Transaction and TransactionItems
      const newTransaction = await tx.transaction.create({
        data: {
          invoice_number,
          transaction_type,
          customerId: customerId ?? null,
          staffId: userId,
          subtotal: subtotal,
          tax_total: taxTotal,
          discount_total: discountTotal,
          grand_total: grandTotal,
          transactionItems: {
            create: transactionItemsData,
          },
          payments: {
            create: paymentsCreateData,
          },
        },
        include: {
          transactionItems: true,
          payments: {
            include: {
              cashPayment: true,
              gCashPayment: true,
              creditPayment: true,
            },
          },
        },
      });

      return CheckoutTransactionResponseDto.fromEntities(
        newTransaction,
        newTransaction.transactionItems,
      );
    });
  }

  /*
  Get receipt by transaction ID
  */
  async getReceipt(transactionId: number): Promise<GetReceiptResponseDto> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        staff: true,
        customer: true,
        transactionItems: {
          include: {
            product: true,
          },
        },
        payments: {
          include: {
            cashPayment: true,
            gCashPayment: true,
            creditPayment: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException(
        `Receipt for Transaction #${transactionId} not found.`,
      );
    }

    return GetReceiptResponseDto.fromEntity(transaction);
  }
}
