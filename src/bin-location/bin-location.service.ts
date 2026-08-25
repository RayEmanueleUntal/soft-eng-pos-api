import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBinLocDto } from './dto';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class BinLocationService {
  constructor(private readonly prisma: PrismaService) {}

  // Creates Bin Location
  async createBinLocation(createBinDto: CreateBinLocDto) {
    try {
      const bin = this.prisma.binLocation.create({
        data: createBinDto,
      });
      return bin;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new Error(
          `Bin location already exists with Aisle Number: '${createBinDto.aisle_number} and Shelf Location: '${createBinDto.shelf_location}''`,
        );
      }
      throw error;
    }
  }
}
