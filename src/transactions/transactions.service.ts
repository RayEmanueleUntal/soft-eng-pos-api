import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetReceiptResponseDto } from './dto';

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
}
