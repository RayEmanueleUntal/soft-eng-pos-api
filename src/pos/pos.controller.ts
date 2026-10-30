// src/pos/pos.controller.ts
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PosService } from './pos.service';
import { JwtAuthGuard, RolesGuard } from 'src/auth/guards';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  CheckoutApiBodyOptions,
  CheckoutDto,
  CheckoutTransactionResponseDto,
} from './dto';
import { Idempotent } from 'src/common/decorators';
import { CurrentUser, Roles } from 'src/auth/decorators';
import { AssignedRole as Role } from 'src/generated/prisma/enums';

@ApiTags('POS')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  /**
   * HTTP POST Endpoint for executing a POS sale / checkout transaction.
   * Atomic operation that calculates line totals, snapshot WAC cost prices, verifies UOM conversion factors,
   * deducts inventory stock levels, updates wholesale balances, and registers polymorphic payments.
   */
  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  @Idempotent()
  @Roles(
    Role.ADMIN,
    Role.MANAGER,
    Role.CASHIER,
    Role.SALES_CLERK,
    Role.SECRETARY,
  )
  @ApiOperation({
    summary: 'Process POS checkout and create transaction',
    description:
      'Executes a retail or wholesale point-of-sale checkout transaction. Validates stock availability, applies UOM conversions, snapshots Weighted Average Cost (WAC) prices, enforces customer credit limits and overdue payment rules (bypassable via cashier/manager override flag), deducts inventory, and records payment mutations.',
  })
  @ApiBody(CheckoutApiBodyOptions)
  @ApiCreatedResponse({
    description: 'Transaction and line items created successfully.',
    type: CheckoutTransactionResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Validation failed or payment mismatch (e.g. payment total less than grand total, or retail/wholesale item type mismatch).',
    schema: {
      examples: {
        InsufficientPayment: {
          summary: 'Tendered payment is less than total price',
          value: {
            statusCode: 400,
            error: 'Bad Request',
            message: 'Insufficient payment. Total: 1500.00, Paid: 1000.00',
          },
        },
        TypeMismatch: {
          summary: 'Transaction type mismatch with item types',
          value: {
            statusCode: 400,
            error: 'Bad Request',
            message:
              'Cannot process a Retail transaction containing wholesale items.',
          },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description:
      'Access forbidden due to insufficient RBAC role, non-wholesale customer credit usage, or un-overridden overdue invoice status.',
    schema: {
      examples: {
        OverdueCreditBlocked: {
          summary: 'Blocked due to overdue invoices',
          value: {
            statusCode: 403,
            error: 'Forbidden',
            message:
              'Checkout blocked: Customer #42 has 2 overdue invoice(s) totalling ₱3500.00. Manager override is required to proceed.',
          },
        },
        InsufficientCreditLimit: {
          summary: 'Customer exceeded wholesale credit limit',
          value: {
            statusCode: 403,
            error: 'Forbidden',
            message:
              'Customer #42 has insufficient credit limit. Requested: 5000.00, Available: 2000.00',
          },
        },
        NonWholesaleCreditAttempt: {
          summary: 'Retail customer attempting credit payment',
          value: {
            statusCode: 403,
            error: 'Forbidden',
            message:
              'Customer must be a wholesale customer to use credits as payment.',
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Product or Customer record not found.',
    schema: {
      example: {
        statusCode: 404,
        error: 'Not Found',
        message: 'Product with ID 101 not found.',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication credentials are missing or invalid.',
  })
  checkout(
    @CurrentUser() user: { id: number },
    @Body() checkoutDto: CheckoutDto,
  ): Promise<CheckoutTransactionResponseDto> {
    return this.posService.checkout(user.id, checkoutDto);
  }
}
