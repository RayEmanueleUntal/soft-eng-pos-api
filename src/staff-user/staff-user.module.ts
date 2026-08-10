import { Module } from '@nestjs/common';
import { StaffUserController } from './staff-user.controller';
import { StaffUserService } from './staff-user.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [StaffUserController],
  providers: [StaffUserService],
  imports: [PrismaModule],
})
export class StaffUserModule {}
