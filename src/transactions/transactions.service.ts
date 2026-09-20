import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetReceiptResponseDto } from './dto';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);
  constructor(private readonly prisma: PrismaService) {}

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

  // Helper function: generating invoice number
  async getNextInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear();

    // ATOMIC: PostgreSQL increments and returns the next value in a single lock-free operation
    const result = await tx.$queryRaw<{ nextval: bigint }[]>`
      SELECT nextval('invoice_number_seq')
    `;

    const seq = Number(result[0].nextval);
    const paddedSequence = String(seq).padStart(4, '0');

    return `INV-${year}-${paddedSequence}`;
  }

  /**
   * Accepts a transaction client and creates the transaction.
   */
  async createTransaction(
    tx: Prisma.TransactionClient,
    data: Prisma.TransactionUncheckedCreateInput,
  ) {
    return await tx.transaction.create({
      data,
      include: {
        transactionItems: true,
        payments: {
          include: {
            cashPayment: true,
            gCashPayment: true,
            creditPayment: true,
          },
        },
      },
    });
  }
}
