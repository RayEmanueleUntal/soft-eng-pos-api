import { Module } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SystemSettingsModule } from 'src/system-settings/system-settings.module';
import { ApprovalModule } from 'src/approval/approval.module';
import { InventoryModule } from 'src/inventory/inventory.module';
import { ExchangeApprovalHandler, RefundApprovalHandler } from './handlers';

@Module({
  imports: [
    PrismaModule,
    SystemSettingsModule,
    ApprovalModule,
    InventoryModule,
  ],
  providers: [ReturnsService, RefundApprovalHandler, ExchangeApprovalHandler],
  controllers: [ReturnsController],
})
export class ReturnsModule {}
