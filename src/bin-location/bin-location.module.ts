import { Module } from '@nestjs/common';
import { BinLocationService } from './bin-location.service';
import { BinLocationController } from './bin-location.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [BinLocationService],
  controllers: [BinLocationController],
})
export class BinLocationModule {}
