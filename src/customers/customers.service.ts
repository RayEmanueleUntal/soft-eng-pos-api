import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCustomerDto, GetCustomerDto, UpdateCustomerDto } from './dto';
import { DuplicateCustomerException } from 'src/common/exceptions/duplicate-customer.exception';
import { CustomerType } from 'src/generated/prisma/enums';
import { CustomerResponseDto } from './dto/response/customer-response.dto';
import { Prisma } from 'src/generated/prisma/client';
import { AssignedRole as Role } from 'src/generated/prisma/enums';
import { PaginatedCustomerResponseDto } from './dto/response/paginated-customer-response.dto';

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
      outstanding_balance,
    } = updateDto;

    // 2. Target type evaluation
    const targetType = type ?? existingCustomer.type;
    const isTargetWholesale = targetType === CustomerType.WHOLESALE;
    const isModifyingWholesaleFields =
      isTargetWholesale ||
      company_name !== undefined ||
      credit_limit !== undefined ||
      outstanding_balance !== undefined;

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

    // 4. Construct Wholesale relation updates (`upsert`, `update`, or `delete`)
    let wholesaleRelationUpdate:
      Prisma.WholeSaleCustomerUpdateOneWithoutCustomerNestedInput | undefined;

    if (isTargetWholesale) {
      wholesaleRelationUpdate = {
        upsert: {
          create: {
            company_name: company_name ?? 'N/A',
            credit_limit: new Prisma.Decimal(credit_limit ?? 0),
            outstanding_balance: new Prisma.Decimal(outstanding_balance ?? 0),
          },
          update: {
            ...(company_name !== undefined && { company_name }),
            ...(credit_limit !== undefined && {
              credit_limit: new Prisma.Decimal(credit_limit),
            }),
            ...(outstanding_balance !== undefined && {
              outstanding_balance: new Prisma.Decimal(outstanding_balance),
            }),
          },
        },
      };
    } else if (type === CustomerType.RETAIL && existingCustomer.wholesale) {
      // If downgraded from WHOLESALE to RETAIL, remove the wholesale profile
      wholesaleRelationUpdate = {
        delete: true,
      };
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
}
