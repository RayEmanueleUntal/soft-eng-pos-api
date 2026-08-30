import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard, RolesGuard } from 'src/auth/guards';
import { AssignedRole, AssignedRole as Role } from 'src/generated/prisma/enums';
import { Idempotent } from 'src/common/decorators';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { CustomerResponseDto } from './dto/response/customer-response.dto';
import { CurrentUser, Roles } from 'src/auth/decorators';
import { CreateCustomerDto } from './dto';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customerService: CustomersService) {}

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
}
