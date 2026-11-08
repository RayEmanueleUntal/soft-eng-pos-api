import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateExpenseDto,
  UpdateExpenseDto,
  GetExpensesQueryDto,
} from './dto/requests';
import {
  ExpenseResponseDto,
  PaginatedExpensesResponseDto,
} from './dto/responses';
import {
  ExpenseNotFoundException,
  InvalidExpenseAmountException,
} from 'src/common/exceptions/expenses';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log a new expense record in the system.
   */
  async createExpense(
    dto: CreateExpenseDto,
    staffId: number,
  ): Promise<ExpenseResponseDto> {
    this.logger.log(
      `Creating expense entry: category=${dto.category}, amount=${dto.amount}, staffId=${staffId}`,
    );

    if (dto.amount <= 0) {
      this.logger.warn(
        `Failed to create expense: amount ${dto.amount} is non-positive`,
      );
      throw new InvalidExpenseAmountException(dto.amount);
    }

    const expense = await this.prisma.expense.create({
      data: {
        category: dto.category,
        amount: new Prisma.Decimal(dto.amount),
        payment_method: dto.payment_method,
        date: dto.date ? new Date(dto.date) : undefined,
        notes: dto.notes,
        staffId,
      },
      include: {
        staff: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    this.logger.log(
      `Expense record #${expense.id} successfully created by staffId=${staffId}`,
    );
    return ExpenseResponseDto.fromEntity(expense);
  }

  /**
   * Fetch paginated expense records based on query parameters.
   */
  async getExpenses(
    queryDto: GetExpensesQueryDto,
  ): Promise<PaginatedExpensesResponseDto> {
    const {
      page = 1,
      limit = 10,
      category,
      payment_method,
      startDate,
      endDate,
      search,
    } = queryDto;
    const skip = (page - 1) * limit;

    const where: Prisma.ExpenseWhereInput = {};

    if (category) {
      where.category = category;
    }

    if (payment_method) {
      where.payment_method = payment_method;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    if (search) {
      where.notes = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const [expenses, total, sumAggregate] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          staff: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      }),
      this.prisma.expense.count({ where }),
      this.prisma.expense.aggregate({
        where,
        _sum: {
          amount: true,
        },
      }),
    ]);

    const totalAmount = sumAggregate._sum.amount
      ? Number(sumAggregate._sum.amount)
      : 0;
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: expenses.map(ExpenseResponseDto.fromEntity),
      total,
      page,
      limit,
      totalPages,
      totalAmount,
    };
  }

  /**
   * Retrieve single expense details by ID.
   */
  async getExpenseById(id: number): Promise<ExpenseResponseDto> {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        staff: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    if (!expense) {
      this.logger.warn(`Expense query failed: ID #${id} not found`);
      throw new ExpenseNotFoundException(id);
    }

    return ExpenseResponseDto.fromEntity(expense);
  }

  /**
   * Update an existing expense record.
   */
  async updateExpense(
    id: number,
    dto: UpdateExpenseDto,
    staffId: number,
  ): Promise<ExpenseResponseDto> {
    this.logger.log(`Updating expense #${id} requested by staffId=${staffId}`);

    const existingExpense = await this.prisma.expense.findUnique({
      where: { id },
    });

    if (!existingExpense) {
      this.logger.warn(`Update failed: Expense #${id} not found`);
      throw new ExpenseNotFoundException(id);
    }

    if (dto.amount !== undefined && dto.amount <= 0) {
      this.logger.warn(
        `Update failed on expense #${id}: amount ${dto.amount} is non-positive`,
      );
      throw new InvalidExpenseAmountException(dto.amount);
    }

    const updatedExpense = await this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.category && { category: dto.category }),
        ...(dto.amount !== undefined && {
          amount: new Prisma.Decimal(dto.amount),
        }),
        ...(dto.payment_method && { payment_method: dto.payment_method }),
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: {
        staff: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    this.logger.log(
      `Expense record #${id} updated successfully by staffId=${staffId}`,
    );
    return ExpenseResponseDto.fromEntity(updatedExpense);
  }

  /**
   * Remove an expense record.
   */
  async deleteExpense(id: number, staffId: number): Promise<void> {
    this.logger.log(
      `Deleting expense record #${id} requested by staffId=${staffId}`,
    );

    const existingExpense = await this.prisma.expense.findUnique({
      where: { id },
    });

    if (!existingExpense) {
      this.logger.warn(`Delete failed: Expense #${id} not found`);
      throw new ExpenseNotFoundException(id);
    }

    await this.prisma.expense.delete({
      where: { id },
    });

    this.logger.log(
      `Expense record #${id} successfully deleted by staffId=${staffId}`,
    );
  }
}
