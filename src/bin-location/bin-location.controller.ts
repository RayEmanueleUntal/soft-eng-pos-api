import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { BinLocationService } from './bin-location.service';
import { CreateBinLocDto } from './dto';
import { JwtAuthGuard, RolesGuard } from 'src/auth/guards';
import { Roles } from 'src/auth/decorators';
import { AssignedRole as Role } from 'src/generated/prisma/enums';

@Controller('bin-location')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BinLocationController {
  constructor(private readonly binLocService: BinLocationService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STOCK_MANAGEMENT)
  createBinLocation(@Body() createBinDto: CreateBinLocDto) {
    return this.binLocService.createBinLocation(createBinDto);
  }
}
