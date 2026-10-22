import { Module } from '@nestjs/common';
import { ForwarderController } from './forwarder.controller';
import { ForwarderService } from './forwarder.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ForwarderController],
  providers: [ForwarderService],
  exports: [ForwarderService],
})
export class ForwarderModule {}
