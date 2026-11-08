import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import {
  CreateExpenseDto,
  UpdateExpenseDto,
  GetExpensesQueryDto,
} from './dto/requests';
import {
  ExpenseResponseDto,
  PaginatedExpensesResponseDto,
} from './dto/responses';
import { JwtAuthGuard, RolesGuard } from 'src/auth/guards';
import { Roles, CurrentUser } from 'src/auth/decorators';
import { Idempotent } from 'src/common/decorators';
import { AssignedRole as Role } from 'src/generated/prisma/client';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  /**
   * Create a new expense record.
   */
  @Post()
  @Idempotent()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SECRETARY)
  @ApiOperation({
    summary: 'Log a new operational expense',
    description:
      'Records an operational expense (utilities, rent, logistics, etc.). Restricted to Admin, Manager, and Secretary roles.',
  })
  @ApiCreatedResponse({
    type: ExpenseResponseDto,
    description: 'Expense record successfully created.',
  })
  @ApiBadRequestResponse({ description: 'Invalid payload or amount <= 0.' })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid authentication token.',
  })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  async createExpense(
    @Body() dto: CreateExpenseDto,
    @CurrentUser() user: { id: number },
  ): Promise<ExpenseResponseDto> {
    return this.expensesService.createExpense(dto, user.id);
  }

  /**
   * Get paginated expense records with optional filters.
   */
  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SECRETARY)
  @ApiOperation({
    summary: 'Retrieve paginated operational expenses',
    description:
      'Fetches expense records with pagination, date range filtering, category filtering, and search terms.',
  })
  @ApiOkResponse({
    type: PaginatedExpensesResponseDto,
    description: 'Paginated expense records retrieved successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid authentication token.',
  })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  async getExpenses(
    @Query() queryDto: GetExpensesQueryDto,
  ): Promise<PaginatedExpensesResponseDto> {
    return this.expensesService.getExpenses(queryDto);
  }

  /**
   * Get single expense record by ID.
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SECRETARY)
  @ApiOperation({
    summary: 'Get expense record by ID',
    description: 'Retrieves specific details of an operational expense.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Unique numerical ID of the expense',
  })
  @ApiOkResponse({
    type: ExpenseResponseDto,
    description: 'Expense record retrieved successfully.',
  })
  @ApiNotFoundResponse({ description: 'Expense record not found.' })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid authentication token.',
  })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  async getExpenseById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ExpenseResponseDto> {
    return this.expensesService.getExpenseById(id);
  }

  /**
   * Update existing expense record.
   */
  @Patch(':id')
  @Idempotent()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SECRETARY)
  @ApiOperation({
    summary: 'Update an operational expense record',
    description:
      'Updates fields of an existing expense record. Restricted to Admin, Manager, and Secretary roles.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Unique numerical ID of the expense',
  })
  @ApiOkResponse({
    type: ExpenseResponseDto,
    description: 'Expense record successfully updated.',
  })
  @ApiBadRequestResponse({ description: 'Invalid parameters or payload.' })
  @ApiNotFoundResponse({ description: 'Expense record not found.' })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid authentication token.',
  })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  async updateExpense(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExpenseDto,
    @CurrentUser() user: { id: number },
  ): Promise<ExpenseResponseDto> {
    return this.expensesService.updateExpense(id, dto, user.id);
  }

  /**
   * Delete expense record.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Idempotent()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SECRETARY)
  @ApiOperation({
    summary: 'Delete an operational expense record',
    description:
      'Permanently removes an expense record from the ledger. Restricted to Admin, Manager, and Secretary roles.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Unique numerical ID of the expense',
  })
  @ApiNoContentResponse({ description: 'Expense record successfully deleted.' })
  @ApiNotFoundResponse({ description: 'Expense record not found.' })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid authentication token.',
  })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  async deleteExpense(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
  ): Promise<void> {
    return this.expensesService.deleteExpense(id, user.id);
  }
}
