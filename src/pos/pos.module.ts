import { Module } from '@nestjs/common';
import { PosService } from './pos.service';
import { PosController } from './pos.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { InventoryModule } from 'src/inventory/inventory.module';
import { TransactionsModule } from 'src/transactions/transactions.module';
import { CustomersModule } from 'src/customers/customers.module';

@Module({
  imports: [PrismaModule, InventoryModule, TransactionsModule, CustomersModule],
  providers: [PosService],
  controllers: [PosController],
})
export class PosModule {}
