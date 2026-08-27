import { Module } from '@nestjs/common';
import { PosService } from './pos.service';
import { PosController } from './pos.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { InventoryModule } from 'src/inventory/inventory.module';

@Module({
  imports: [PrismaModule, InventoryModule],
  providers: [PosService],
  controllers: [PosController],
})
export class PosModule {}
