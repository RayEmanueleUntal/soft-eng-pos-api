import { Module } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SystemSettingsModule } from 'src/system-settings/system-settings.module';
import { ApprovalModule } from 'src/approval/approval.module';

@Module({
  imports: [PrismaModule, SystemSettingsModule, ApprovalModule],
  providers: [ReturnsService],
  controllers: [ReturnsController],
})
export class ReturnsModule {}
