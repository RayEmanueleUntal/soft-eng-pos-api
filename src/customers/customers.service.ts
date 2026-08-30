import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCustomerDto } from './dto';
import { DuplicateCustomerException } from 'src/common/exceptions/duplicate-customer.exception';
import { CustomerType } from 'src/generated/prisma/enums';
import { CustomerResponseDto } from './dto/response/customer-response.dto';
import { Prisma } from 'src/generated/prisma/client';
import { AssignedRole as Role } from 'src/generated/prisma/enums';

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
   * Create a new Customer record with an optional Wholesale profile
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
}
