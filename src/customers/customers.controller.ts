import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard, RolesGuard } from 'src/auth/guards';
import { AssignedRole, AssignedRole as Role } from 'src/generated/prisma/enums';
import { Idempotent } from 'src/common/decorators';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CustomerResponseDto } from './dto/response/customer-response.dto';
import { CurrentUser, Roles } from 'src/auth/decorators';
import {
  CreateCustomerDto,
  CreateCustomerPaymentDto,
  CustomerPaymentResponseDto,
  GetCustomerDto,
  UpdateCustomerDto,
} from './dto';
import { PaginatedCustomerResponseDto } from './dto/response/paginated-customer-response.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customerService: CustomersService) {}

  /*
   * Create a new Customer record with an optional Wholesale profile
   */
  @Post()
  @Idempotent()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SECRETARY, Role.CASHIER)
  @ApiOperation({
    summary: 'Create customer profile',
    description: 'Creates a new retail or wholesale customer profile.',
  })
  @ApiCreatedResponse({
    description: 'Customer created successfully',
    type: CustomerResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions for wholesale profile',
  })
  @ApiConflictResponse({
    description: 'Customer contact number already exists',
  })
  createCustomer(
    @CurrentUser() user: { id: number; assigned_role: any; username: any },
    @Body() customerDto: CreateCustomerDto,
  ): Promise<CustomerResponseDto> {
    console.log(user.id);
    console.log(user.assigned_role);
    console.log(user!.username!);
    return this.customerService.createCustomer(
      user.id,
      user.assigned_role,
      customerDto,
    );
  }

  /**
   * Retrieve customers with multi-keyword search, strict filters, and pagination
   */
  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SECRETARY, Role.CASHIER)
  @ApiOperation({
    summary: 'Get paginated customers list',
    description: 'Retrieves customers with search and filter parameters.',
  })
  @ApiOkResponse({
    description: 'List of customers retrieved',
    type: PaginatedCustomerResponseDto,
  })
  getCustomers(
    @CurrentUser() user: { id: number },
    @Query() queryDto: GetCustomerDto,
  ): Promise<PaginatedCustomerResponseDto> {
    return this.customerService.getCustomers(user.id, queryDto);
  }

  /**
   * Retrieve customers with multi-keyword search, strict filters, and pagination
   */
  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SECRETARY, Role.CASHIER)
  @ApiOperation({
    summary: 'Update existing customer profile by ID',
    description:
      'Modifies customer details. Cashiers can update basic contact info; updating wholesale profiles or credit limits requires Manager/Admin privileges.',
  })
  @ApiOkResponse({
    description: 'Customer updated successfully.',
    type: CustomerResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Customer ID not found.',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions to modify wholesale parameters.',
  })
  @ApiConflictResponse({
    description: 'Updated contact number collides with an existing customer.',
  })
  async updateCustomer(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number; assigned_role: Role },
    @Body() updateCustomerDto: UpdateCustomerDto,
  ): Promise<CustomerResponseDto> {
    return this.customerService.updateCustomer(
      id,
      user.id,
      user.assigned_role,
      updateCustomerDto,
    );
  }

  /**
   * Endpoint for collecting wholesale credit settlement payments.
   */
  @Post('wholesale/:customerId/payments')
  @Idempotent()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SECRETARY, Role.CASHIER)
  @ApiOperation({
    summary: 'Collect wholesale credit payment',
    description:
      'Records a payment settlement for a wholesale customer credit account. Decrements outstanding balance and logs audit snapshots.',
  })
  @ApiCreatedResponse({
    description:
      'Payment collected successfully and recorded in credit ledger.',
    type: CustomerPaymentResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid payment amount or payment exceeds outstanding balance.',
  })
  @ApiNotFoundResponse({
    description: 'Customer or Wholesale profile not found.',
  })
  @ApiUnauthorizedResponse({ description: 'JWT authentication required.' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions.' })
  async collectWholesalePayment(
    @Param('customerId', ParseIntPipe) customerId: number,
    @CurrentUser() user: { id: number },
    @Body() dto: CreateCustomerPaymentDto,
  ): Promise<CustomerPaymentResponseDto> {
    return this.customerService.collectWholesalePayment(
      customerId,
      user.id,
      dto,
    );
  }
}
