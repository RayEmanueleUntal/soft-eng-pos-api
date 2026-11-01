import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CustomersService } from 'src/customers/customers.service';

@Injectable()
export class CreditStatusTaskService {
  private readonly logger = new Logger(CreditStatusTaskService.name);

  constructor(private readonly customers: CustomersService) {}

  /**
   * Daily CRON job to scan and transition past-due credit payments to OVERDUE status.
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async handleCreditStatusCheck(): Promise<void> {
    this.logger.log(
      'Starting daily scheduled check for overdue credit payments...',
    );
    const startTime = Date.now();

    try {
      const result = await this.customers.updateOverduePaymentsStatus();
      const duration = Date.now() - startTime;

      this.logger.log(
        `Completed overdue credit status check in ${duration}ms. Marked ${result.count} record(s) as OVERDUE.`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to complete daily overdue credit status check: ${error?.message}`,
        error?.stack,
      );
    }
  }
}
