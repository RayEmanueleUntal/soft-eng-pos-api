import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  GetReceiptResponseDto,
  GetTransactionsQueryDto,
  PaginatedTransactionsResponseDto,
} from './dto';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch paginated list of transactions filtered by status, types, dates, or search criteria.
   */
  async getTransactions(
    queryDto: GetTransactionsQueryDto,
  ): Promise<PaginatedTransactionsResponseDto> {
    const {
      page,
      limit,
      search,
      status,
      transaction_type,
      staffId,
      customerId,
      startDate,
      endDate,
      includeShipments,
      includeReturns,
      includeExchanges,
    } = queryDto;

    this.logger.log(
      `Fetching transactions - Page: \({page}, Limit:\){limit}, Search: "${search ?? ''}"`,
    );

    const skip = (page - 1) * limit;

    // Build dynamic Prisma filter clause
    const where: Prisma.TransactionWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (transaction_type) {
      where.transaction_type = transaction_type;
    }

    if (staffId) {
      where.staffId = staffId;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (startDate || endDate) {
      where.date = {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate }),
      };
    }

    if (search) {
      where.OR = [
        {
          invoice_number: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          customer: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    try {
      // Execute query count and findMany concurrently for optimal DB performance
      const [transactions, total] = await Promise.all([
        this.prisma.transaction.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            date: 'desc',
          },
          include: {
            staff: true,
            customer: true,
            transactionItems: {
              include: {
                product: true,
              },
            },
            payments: {
              include: {
                cashPayment: true,
                gCashPayment: true,
                creditPayment: true,
              },
            },
            shipments: includeShipments
              ? {
                  include: {
                    forwarder: true,
                  },
                }
              : false,
            returns: includeReturns
              ? {
                  include: {
                    product: true,
                    staff: true,
                  },
                }
              : false,
            exchanges: includeExchanges
              ? {
                  include: {
                    product: true,
                  },
                }
              : false,
          },
        }),
        this.prisma.transaction.count({ where }),
      ]);

      this.logger.log(
        `Successfully retrieved \({transactions.length} transactions out of\){total} total records.`,
      );

      return PaginatedTransactionsResponseDto.fromEntities(
        transactions,
        total,
        page,
        limit,
      );
    } catch (error) {
      this.logger.error(
        `Failed to retrieve transactions: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /*
  Get receipt by transaction ID
  */
  async getReceipt(
    transactionId: number,
    includeShipments: boolean = false,
    includeReturns: boolean = false,
    includeExchanges: boolean = false,
  ): Promise<GetReceiptResponseDto> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        staff: true,
        customer: true,
        transactionItems: {
          include: {
            product: true,
          },
        },
        payments: {
          include: {
            cashPayment: true,
            gCashPayment: true,
            creditPayment: true,
          },
        },
        shipments: includeShipments
          ? {
              include: {
                forwarder: true,
              },
            }
          : false,
        returns: includeReturns
          ? {
              include: {
                product: true,
                staff: true,
              },
            }
          : false,
        exchanges: includeExchanges
          ? {
              include: {
                product: true,
              },
            }
          : false,
      },
    });

    if (!transaction) {
      throw new NotFoundException(
        `Receipt for Transaction #${transactionId} not found.`,
      );
    }

    return GetReceiptResponseDto.fromEntity(transaction);
  }
}
