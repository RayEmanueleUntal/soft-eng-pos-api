import { Module } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { DeliveriesController } from './deliveries.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { InventoryModule } from 'src/inventory/inventory.module';

@Module({
  imports: [PrismaModule, InventoryModule],
  providers: [DeliveriesService],
  controllers: [DeliveriesController],
  exports: [DeliveriesService],
})
export class DeliveriesModule {}
