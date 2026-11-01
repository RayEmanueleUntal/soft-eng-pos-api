import { Module } from '@nestjs/common';
import { CustomersModule } from 'src/customers/customers.module';
import { CreditStatusTaskService } from './schedulers/credit-status-task/credit-status-task.service';

@Module({
  imports: [CustomersModule],
  providers: [CreditStatusTaskService],
})
export class TasksModule {}
