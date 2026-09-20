import { Module } from '@nestjs/common';
import { ApprovalController } from './approval.controller';
import { ApprovalService } from './approval.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ApprovalRegistry } from './approval-registry.service';

@Module({
  imports: [PrismaModule],
  controllers: [ApprovalController],
  providers: [ApprovalService, ApprovalRegistry],
  exports: [ApprovalService, ApprovalRegistry],
})
export class ApprovalModule {}
