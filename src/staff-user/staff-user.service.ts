import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStaffProfileDto } from './dto';
import { Prisma } from 'src/generated/prisma/client';
import * as argon from 'argon2';

@Injectable()
export class StaffUserService {
  constructor(private prisma: PrismaService) {}

  // Create Staff Profile
  async createStaffProfile(staffProfileDto: CreateStaffProfileDto) {
    const hash = await argon.hash(staffProfileDto.password);
    try {
      return await this.prisma.staffUser.create({
        data: {
          username: staffProfileDto.username,
          password_hash: hash,
          first_name: staffProfileDto.first_name,
          last_name: staffProfileDto.last_name,
          assigned_role: staffProfileDto.assignedRole,
        },
      });
    } catch (error) {
      // Check if the error comes from Prisma
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2002 is the unique constraint violation error code
        if (error.code === 'P2002') {
          throw new Error('User already exists with this unique field.');
        }
      }
      throw error;
    }
  }
}
