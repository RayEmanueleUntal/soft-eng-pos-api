import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CheckoutDto,
  CheckoutTransactionResponseDto,
  GetProductsDto,
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
      // Check user
      const customer = customerId
        ? await tx.customer.findUnique({
            where: { id: customerId },
            include: { wholesale: true },
          })
        : null;

      // Verify that for a wholesale transaction, there exists at least one wholesale item
      let hasWholesaleItems: boolean = false;
      for (const item of items) {
        if (item.transaction_type === TransactionType.WHOLESALE) {
          hasWholesaleItems = true;
          break;
        }
      }

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

      // Only wholesale customers can use credit
      const creditPayment = payments.find(
        (payment) => payment.payment_method === PaymentMethod.CREDIT,
      );
      if (
        creditPayment &&
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
      if (creditPayment) {
        const creditLimit = customer!.wholesale!.credit_limit.toNumber();
        const currentBalance =
          customer!.wholesale!.outstanding_balance?.toNumber() ?? 0;
        const availableCredit = creditLimit - currentBalance;

        if (creditPayment.amount_paid > availableCredit) {
          throw new InsufficientCreditException(
            customerId!,
            creditPayment.amount_paid,
            availableCredit,
          );
        }
      }

      // Fetch products from the database to get their actual base prices and types
      const productIds = items.map((item) => item.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      // Create a lookup map
      const productMap = new Map(products.map((p) => [p.id, p]));

      let subtotal = 0;
      let discountTotal = 0;
      const transactionItemsData = items.map((itemDto) => {
        const product = productMap.get(itemDto.productId);
        if (!product) {
          throw new NotFoundException(
            `Product with ID ${itemDto.productId} not found.`,
          );
        }

        // Determine unit price based on whether the item is retail or wholesale
        const unitPrice =
          itemDto.transaction_type === TransactionType.WHOLESALE
            ? Number(product?.wholesale_price)
            : Number(product?.retail_price);

        const quantity = Number(itemDto.quantity_sold);
        const discount = Number(itemDto.line_discount ?? 0);

        // Calculate line item subtotal: (quantity x unit_price) - discount
        const itemSubtotal = quantity * unitPrice - discount;
        discountTotal += discount;
        subtotal += itemSubtotal;

        return {
          productId: itemDto.productId,
          quantity_sold: quantity,
          unit_of_measure: product?.pricing_uom ?? UnitOfMeasure.PCS, // fallback unit
          unit_price: unitPrice,
          discount: discount,
          subtotal: itemSubtotal,
        };
      });

      // TODO: NEED CONFIRMATION. MIGHT ADD TAX LOGIC.
      // Philippine BIR context: Determine if retail prices are VAT-inclusive (default)
      // and wholesale prices are VAT-exclusive, or if the business is non-VAT.
      const taxTotal = 0; // tax placeholder

      // Calculate grand total
      const grandTotal = subtotal + taxTotal - discountTotal;

      // Calculate total paid
      const totalPaid = payments.reduce((acc, p) => acc + p.amount_paid, 0);

      // Total validation check
      if (totalPaid < grandTotal) {
        throw new BadRequestException(
          `Insufficient payment. Total: ${grandTotal}, Paid: ${totalPaid}`,
        );
      }

      // Get Invoice number
      const invoice_number = await this.getNextInvoiceNumber(tx);

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

      // Create the Transaction and TransactionItems
      const newTransaction = await tx.transaction.create({
        data: {
          invoice_number: invoice_number,
          transaction_type: transaction_type,
          customerId: customerId ?? null,
          staffId: userId,
          subtotal: subtotal,
          tax_total: taxTotal,
          discount_total: discountTotal,
          grand_total: grandTotal,

          transactionItems: {
            create: transactionItemsData,
          },
        },
        include: {
          transactionItems: true,
        },
      });

      return CheckoutTransactionResponseDto.fromEntities(
        newTransaction,
        newTransaction.transactionItems,
      );
    });
  }
}
