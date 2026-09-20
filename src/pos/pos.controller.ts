import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PosService } from './pos.service';
import { JwtAuthGuard, RolesGuard } from 'src/auth/guards';
import {
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CheckoutApiBodyOptions,
  CheckoutDto,
  CheckoutTransactionResponseDto,
} from './dto';
import { Idempotent } from 'src/common/decorators';
import { CurrentUser, Roles } from 'src/auth/decorators';
import { AssignedRole as Role } from 'src/generated/prisma/enums';

@ApiTags('POS / Transactions')
@Controller('pos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PosController {
  constructor(private readonly posService: PosService) {}

  /*
  Checkout items
  */
  @Post('/checkout')
  @Idempotent()
  @ApiOperation({ summary: 'Checkout transaction of items' })
  @ApiBody(CheckoutApiBodyOptions)
  @ApiOkResponse({
    description: 'Transaction record created successfully',
    type: CheckoutTransactionResponseDto,
  })
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
  checkout(
    @CurrentUser() user: { id: number },
    @Body() checkoutDto: CheckoutDto,
  ) {
    return this.posService.checkout(user.id, checkoutDto);
  }
}
