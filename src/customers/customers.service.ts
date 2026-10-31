import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateCustomerDto,
  CreateCustomerPaymentDto,
  CustomerOverdueStatusResponseDto,
  CustomerPaymentResponseDto,
  GetCustomerDto,
  GetCustomerPaymentsDto,
  PaginatedCustomerPaymentsResponseDto,
  UpdateCustomerDto,
} from './dto';
import { CustomerType, PaymentMethod } from 'src/generated/prisma/client';
import { CustomerResponseDto } from './dto/response/customer-response.dto';
import { Prisma } from 'src/generated/prisma/client';
import { CreditStatus, AssignedRole as Role } from 'src/generated/prisma/enums';
import { PaginatedCustomerResponseDto } from './dto/response/paginated-customer-response.dto';
import {
  DuplicateCustomerException,
  InvalidPaymentAmountException,
  WholesaleProfileNotFoundException,
} from 'src/common/exceptions';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  private readonly WHOLESALE_ALLOWED_ROLES: Role[] = [
    Role.ADMIN,
    Role.MANAGER,
    Role.SECRETARY,
  ];

  constructor(private readonly prisma: PrismaService) {}

  /*
   Create a new Customer record with an optional Wholesale profile
   */
  async createCustomer(
    userId: number,
    userRole: Role,
    customerDto: CreateCustomerDto,
  ): Promise<CustomerResponseDto> {
    const {
      name,
      contact_number,
      type,
      allowDuplicate,
      company_name,
      credit_limit,
      outstanding_balance,
    } = customerDto;

    // 1. Enforce RBAC for Wholesale Creation
    if (type === CustomerType.WHOLESALE) {
      if (!this.WHOLESALE_ALLOWED_ROLES.includes(userRole)) {
        this.logger.warn(
          `Unauthorized wholesale creation attempt by User #${userId} with Role "${userRole}"`,
        );
        throw new ForbiddenException(
          `Only managers or administrative staff are authorized to onboard WHOLESALE customers and grant credit limits.`,
        );
      }
    }

    this.logger.log(
      `User #${userId} (${userRole}) initiating creation for ${type} customer "${name}"`,
    );

    // 2. Duplicate Check
    const existingCustomer = await this.prisma.customer.findFirst({
      where: { contact_number },
    });

    if (existingCustomer && !allowDuplicate) {
      throw new DuplicateCustomerException({
        id: existingCustomer.id,
        name: existingCustomer.name,
        contact_number: existingCustomer.contact_number,
        type: existingCustomer.type,
      });
    }

    // 3. Persist Customer & Wholesale Profile
    const isWholesale = type === CustomerType.WHOLESALE;
    const newCustomer = await this.prisma.customer.create({
      data: {
        name,
        contact_number,
        type: type ?? CustomerType.RETAIL,
        wholesale:
          isWholesale && company_name
            ? {
                create: {
                  company_name,
                  credit_limit: new Prisma.Decimal(credit_limit ?? 0),
                  outstanding_balance: new Prisma.Decimal(
                    outstanding_balance ?? 0,
                  ),
                },
              }
            : undefined,
      },
      include: { wholesale: true },
    });

    return CustomerResponseDto.fromEntity(newCustomer);
  }

  /**
   * Retrieve customers with multi-keyword search, strict filters, and pagination
   */
  async getCustomers(
    userId: number,
    queryDto: GetCustomerDto,
  ): Promise<PaginatedCustomerResponseDto> {
    const {
      search,
      name,
      contact_number,
      type,
      company_name,
      page = 1,
      limit = 10,
    } = queryDto;

    this.logger.log(
      `User #${userId} requesting customer list (page=${page}, limit=${limit}, search="${search ?? ''}", type="${type ?? 'ALL'}")`,
    );

    const andConditions: Prisma.CustomerWhereInput[] = [];

    // 1. Multi-keyword flexible search (AND array of OR clauses)
    const searchKeywords = search ? search.trim().split(/\s+/) : [];

    if (searchKeywords.length > 0) {
      const keywordConditions: Prisma.CustomerWhereInput[] = searchKeywords.map(
        (keyword) => ({
          OR: [
            { name: { contains: keyword, mode: 'insensitive' } },
            { contact_number: { contains: keyword, mode: 'insensitive' } },
            {
              wholesale: {
                company_name: { contains: keyword, mode: 'insensitive' },
              },
            },
          ],
        }),
      );

      andConditions.push(...keywordConditions);
    }

    // 2. Specific field filters
    if (name) {
      andConditions.push({ name: { contains: name, mode: 'insensitive' } });
    }

    if (contact_number) {
      andConditions.push({
        contact_number: { contains: contact_number, mode: 'insensitive' },
      });
    }

    if (type) {
      andConditions.push({ type });
    }

    if (company_name) {
      andConditions.push({
        wholesale: {
          company_name: { contains: company_name, mode: 'insensitive' },
        },
      });
    }

    // Build Prisma query object
    const where: Prisma.CustomerWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    const skip = (page - 1) * limit;

    // 3. Execute count and findMany in a transaction for accuracy
    const [total, customers] = await this.prisma.$transaction([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          wholesale: true,
        },
      }),
    ]);

    this.logger.log(
      `Retrieved ${customers.length} of ${total} customers matching criteria for User #${userId}`,
    );

    return {
      data: customers.map(CustomerResponseDto.fromEntity),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Retrieve a single Customer profile by ID including optional wholesale profile
   *
   * @param customerId Primary key ID of the customer
   */
  async getCustomerById(customerId: number): Promise<CustomerResponseDto> {
    this.logger.log(`Fetching Customer details for ID #${customerId}`);

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        wholesale: true,
      },
    });

    if (!customer) {
      this.logger.warn(
        `Customer retrieval failed: Customer #${customerId} not found`,
      );
      throw new NotFoundException(`Customer with ID #${customerId} not found.`);
    }

    return CustomerResponseDto.fromEntity(customer);
  }

  /**
   * Update an existing Customer by ID
   */
  async updateCustomer(
    customerId: number,
    userId: number,
    userRole: Role,
    updateDto: UpdateCustomerDto,
  ): Promise<CustomerResponseDto> {
    this.logger.log(
      `User #${userId} (${userRole}) attempting to update Customer #${customerId}`,
    );

    // 1. Check if customer exists
    const existingCustomer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: { wholesale: true },
    });

    if (!existingCustomer) {
      this.logger.warn(`Update failed: Customer #${customerId} not found`);
      throw new NotFoundException(`Customer with ID #${customerId} not found.`);
    }

    const {
      name,
      contact_number,
      type,
      company_name,
      credit_limit,
      // outstanding_balance,
    } = updateDto;

    // 2. Target type evaluation
    const targetType = type ?? existingCustomer.type;
    const isTargetWholesale = targetType === CustomerType.WHOLESALE;
    const isModifyingWholesaleFields =
      isTargetWholesale ||
      company_name !== undefined ||
      credit_limit !== undefined;

    // Guard wholesale updates by role
    if (isModifyingWholesaleFields) {
      if (!this.WHOLESALE_ALLOWED_ROLES.includes(userRole)) {
        this.logger.warn(
          `Unauthorized wholesale update attempt on Customer #${customerId} by User #${userId} (${userRole})`,
        );
        throw new ForbiddenException(
          'Only managers or administrative staff are authorized to modify wholesale profiles or credit limits.',
        );
      }
    }

    // 3. Prevent duplicate contact number collision with OTHER customers
    if (contact_number && contact_number !== existingCustomer.contact_number) {
      const contactCollision = await this.prisma.customer.findFirst({
        where: {
          contact_number,
          id: { not: customerId },
        },
      });

      if (contactCollision) {
        this.logger.warn(
          `Update blocked: Contact number ${contact_number} is already in use by Customer #${contactCollision.id}`,
        );
        throw new ConflictException(
          `Contact number ${contact_number} is already registered to customer "${contactCollision.name}".`,
        );
      }
    }

    // 4. Construct Wholesale relation updates & Guard against Unpaid Debt Loss
    let wholesaleRelationUpdate:
      Prisma.WholeSaleCustomerUpdateOneWithoutCustomerNestedInput | undefined;

    if (isTargetWholesale) {
      wholesaleRelationUpdate = {
        upsert: {
          create: {
            company_name: company_name ?? 'N/A',
            credit_limit: new Prisma.Decimal(credit_limit ?? 0),
            // outstanding_balance: new Prisma.Decimal(outstanding_balance ?? 0),
            outstanding_balance: new Prisma.Decimal(0),
          },
          update: {
            ...(company_name !== undefined && { company_name }),
            ...(credit_limit !== undefined && {
              credit_limit: new Prisma.Decimal(credit_limit),
            }),
            // ...(outstanding_balance !== undefined && {
            //   outstanding_balance: new Prisma.Decimal(outstanding_balance),
            // }),
          },
        },
      };
    } else if (type === CustomerType.RETAIL && existingCustomer.wholesale) {
      // --- SAFEGUARD ADDED HERE ---
      const currentBalance = new Prisma.Decimal(
        existingCustomer.wholesale.outstanding_balance,
      );

      // Block downgrade if debt exists
      if (currentBalance.gt(0)) {
        this.logger.warn(
          `Downgrade blocked: Wholesale Customer #${customerId} has outstanding balance of ₱${currentBalance.toFixed(2)}`,
        );
        throw new BadRequestException(
          `Cannot convert Wholesale customer to RETAIL while an outstanding balance of ₱${currentBalance.toFixed(2)} exists. Settle all outstanding credit debts first.`,
        );
      }

      // Check if settlement payment audit records exist
      const paymentHistoryCount = await this.prisma.customerPayment.count({
        where: { wholesaleCustId: customerId },
      });

      if (paymentHistoryCount > 0) {
        // Option A: Do NOT delete the record to preserve audit history. Keep wholesale record, just toggle customer type.
        this.logger.log(
          `Customer #${customerId} downgraded to RETAIL. Retaining Wholesale profile to preserve ${paymentHistoryCount} historical payment ledger record(s).`,
        );
        wholesaleRelationUpdate = undefined; // Retain profile in DB so ledger history isn't lost
      } else {
        // Option B: Safe to delete only if 0 balance AND 0 payment history records exist
        wholesaleRelationUpdate = {
          delete: true,
        };
      }
    }

    // 5. Apply database update
    const updatedCustomer = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(name !== undefined && { name }),
        ...(contact_number !== undefined && { contact_number }),
        ...(type !== undefined && { type }),
        wholesale: wholesaleRelationUpdate,
      },
      include: { wholesale: true },
    });

    this.logger.log(
      `Successfully updated Customer #${updatedCustomer.id} ("${updatedCustomer.name}") by User #${userId}`,
    );

    // Re-use your existing CustomerResponseDto mapper
    return CustomerResponseDto.fromEntity(updatedCustomer);
  }

  /**
   * Adjusts the outstanding credit balance of a wholesale customer inside an existing transaction.
   *
   * @param tx Active Prisma transaction client
   * @param customerId Primary key of the Customer
   * @param amountDelta Positive value increases debt (e.g., credit purchase),
   *                    Negative value decreases debt (e.g., payment / return credit)
   */
  async adjustWholesaleBalance(
    tx: Prisma.TransactionClient,
    customerId: number,
    amountDelta: number | Prisma.Decimal,
  ) {
    const wholesaleAccount = await tx.wholeSaleCustomer.findUnique({
      where: { customerId },
    });

    if (!wholesaleAccount) {
      throw new NotFoundException(
        `Wholesale account for Customer #${customerId} not found.`,
      );
    }

    const delta = new Prisma.Decimal(amountDelta);

    const updatedWholesale = await tx.wholeSaleCustomer.update({
      where: { customerId },
      data: {
        outstanding_balance: {
          increment: delta,
        },
      },
    });

    this.logger.log(
      `Adjusted wholesale balance for Customer #${customerId} by ${delta.toFixed(2)}. New balance: ${updatedWholesale.outstanding_balance.toFixed(2)}`,
    );

    return updatedWholesale;
  }

  /**
   * Collects a credit settlement payment for a wholesale customer.
   * Decrements `outstanding_balance` AND settles open `CreditPayment` invoices using FIFO.
   */
  async collectWholesalePayment(
    customerId: number,
    staffId: number,
    dto: CreateCustomerPaymentDto,
  ): Promise<CustomerPaymentResponseDto> {
    const paymentAmount = new Prisma.Decimal(dto.amount_paid);

    if (paymentAmount.lte(0)) {
      throw new InvalidPaymentAmountException(
        'Payment amount must be greater than zero.',
      );
    }

    if (dto.payment_method === PaymentMethod.CREDIT) {
      throw new InvalidPaymentAmountException(
        'Cannot use CREDIT as a payment method to settle outstanding credit balances.',
      );
    }

    this.logger.log(
      `Staff #${staffId} initiating credit settlement payment of ₱${paymentAmount.toFixed(2)} for Wholesale Customer #${customerId}`,
    );

    return await this.prisma.$transaction(async (tx) => {
      // 1. Fetch wholesale account
      const wholesaleAccount = await tx.wholeSaleCustomer.findUnique({
        where: { customerId },
      });

      if (!wholesaleAccount) {
        this.logger.warn(
          `Payment failed: Customer #${customerId} has no active wholesale profile.`,
        );
        throw new WholesaleProfileNotFoundException(customerId);
      }

      const previousBalance = wholesaleAccount.outstanding_balance;

      // 2. Validate non-overpayment constraint
      if (paymentAmount.gt(previousBalance)) {
        this.logger.warn(
          `Payment rejected for Customer #${customerId}: Payment (₱${paymentAmount.toFixed(2)}) exceeds outstanding balance (₱${previousBalance.toFixed(2)})`,
        );
        throw new InvalidPaymentAmountException(
          `Payment amount (₱${paymentAmount.toFixed(2)}) cannot exceed outstanding balance (₱${previousBalance.toFixed(2)}).`,
        );
      }

      // 3. Compute new account balance
      const newBalance = previousBalance.minus(paymentAmount);

      // 4. Update Wholesale Customer macro balance
      await tx.wholeSaleCustomer.update({
        where: { customerId },
        data: {
          outstanding_balance: newBalance,
        },
      });

      // 5. FIFO Settlement against individual CreditPayment records
      let remainingToAllocate = new Prisma.Decimal(paymentAmount);

      const openCreditPayments = await tx.creditPayment.findMany({
        where: {
          payment: {
            transaction: {
              customerId,
            },
          },
          status: {
            in: [
              CreditStatus.UNPAID,
              CreditStatus.PARTIALLY_PAID,
              CreditStatus.OVERDUE,
            ],
          },
        },
        orderBy: { due_date: 'asc' }, // FIFO: settle oldest invoices first
      });

      for (const creditRec of openCreditPayments) {
        if (remainingToAllocate.lte(0)) break;

        const recordBalance = new Prisma.Decimal(
          creditRec.remaining_credit_balance,
        );

        if (remainingToAllocate.gte(recordBalance)) {
          // Fully pay off this credit record
          remainingToAllocate = remainingToAllocate.minus(recordBalance);

          await tx.creditPayment.update({
            where: { paymentId: creditRec.paymentId },
            data: {
              remaining_credit_balance: new Prisma.Decimal(0),
              status: CreditStatus.PAID,
            },
          });
        } else {
          // Partially pay off this credit record
          const newRecordBalance = recordBalance.minus(remainingToAllocate);
          remainingToAllocate = new Prisma.Decimal(0);

          await tx.creditPayment.update({
            where: { paymentId: creditRec.paymentId },
            data: {
              remaining_credit_balance: newRecordBalance,
              status: CreditStatus.PARTIALLY_PAID,
            },
          });
        }
      }

      // 6. Create CustomerPayment audit entry
      const customerPayment = await tx.customerPayment.create({
        data: {
          wholesaleCustId: customerId,
          staffId,
          amount_paid: paymentAmount,
          payment_method: dto.payment_method,
          reference_number: dto.reference_number,
          notes: dto.notes,
          previous_balance: previousBalance,
          new_balance: newBalance,
        },
      });

      this.logger.log(
        `Successfully processed settlement payment #${customerPayment.id} for Wholesale Customer #${customerId}. Prev balance: ₱${previousBalance.toFixed(2)}, New balance: ₱${newBalance.toFixed(2)}`,
      );

      return CustomerPaymentResponseDto.fromEntity(customerPayment);
    });
  }

  /**
   * Retrieves paginated credit settlement payment ledger for a specific wholesale customer.
   */
  async getWholesaleCustomerPayments(
    customerId: number,
    queryDto: GetCustomerPaymentsDto,
  ): Promise<PaginatedCustomerPaymentsResponseDto> {
    const { page = 1, limit = 10 } = queryDto;

    // Verify wholesale account exists
    const wholesaleExists = await this.prisma.wholeSaleCustomer.findUnique({
      where: { customerId },
    });

    if (!wholesaleExists) {
      throw new WholesaleProfileNotFoundException(customerId);
    }

    const skip = (page - 1) * limit;

    const [total, payments] = await this.prisma.$transaction([
      this.prisma.customerPayment.count({
        where: { wholesaleCustId: customerId },
      }),
      this.prisma.customerPayment.findMany({
        where: { wholesaleCustId: customerId },
        skip,
        take: limit,
        orderBy: { payment_date: 'desc' },
      }),
    ]);

    return {
      data: payments.map(CustomerPaymentResponseDto.fromEntity),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Evaluates if a wholesale customer has overdue credit payments.
   * Can be consumed by POS Service or called directly via API.
   */
  async checkCustomerOverdueStatus(
    customerId: number,
  ): Promise<CustomerOverdueStatusResponseDto> {
    const wholesaleAccount = await this.prisma.wholeSaleCustomer.findUnique({
      where: { customerId },
    });

    if (!wholesaleAccount) {
      throw new WholesaleProfileNotFoundException(customerId);
    }

    const now = new Date();

    // Query credit payments associated with customer transactions that are overdue or past due date
    const overdueRecords = await this.prisma.creditPayment.findMany({
      where: {
        payment: {
          transaction: {
            customerId: customerId,
          },
        },
        OR: [
          { status: CreditStatus.OVERDUE },
          {
            status: { in: [CreditStatus.UNPAID, CreditStatus.PARTIALLY_PAID] },
            due_date: { lt: now },
          },
        ],
      },
      select: {
        remaining_credit_balance: true,
      },
    });

    const overdueCount = overdueRecords.length;
    const totalOverdueAmount = overdueRecords.reduce(
      (sum, item) => sum + Number(item.remaining_credit_balance),
      0,
    );

    return {
      customerId,
      hasOverdue: overdueCount > 0,
      overdueCount,
      totalOverdueAmount,
    };
  }
}
