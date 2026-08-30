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
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { CustomerResponseDto } from './dto/response/customer-response.dto';
import { CurrentUser, Roles } from 'src/auth/decorators';
import { CreateCustomerDto, GetCustomerDto, UpdateCustomerDto } from './dto';
import { PaginatedCustomerResponseDto } from './dto/response/paginated-customer-response.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customerService: CustomersService) {}

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

  /*
   * Create a new Customer record with an optional Wholesale profile
   */
  @Post()
  @Idempotent()
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiOkResponse({
    description: 'Customer record created successfully',
    type: CustomerResponseDto,
  })
  @Roles(Role.ADMIN, Role.MANAGER, Role.SECRETARY, Role.CASHIER)
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
  @ApiOperation({
    summary: 'Get paginated list of customers with flexible search',
  })
  @ApiOkResponse({
    description: 'Paginated customer records retrieved successfully.',
    type: PaginatedCustomerResponseDto,
  })
  @Roles(Role.ADMIN, Role.MANAGER, Role.SECRETARY, Role.CASHIER)
  getCustomers(
    @CurrentUser() user: { id: number },
    @Query() queryDto: GetCustomerDto,
  ): Promise<PaginatedCustomerResponseDto> {
    return this.customerService.getCustomers(user.id, queryDto);
  }
}
