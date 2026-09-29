import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import * as argon from 'argon2';
import {
  CreateStaffUserDto,
  GetStaffUsersQueryDto,
  PaginatedStaffUsersResponseDto,
  StaffUserResponseDto,
  UpdateStaffUserDto,
} from './dto';

@Injectable()
export class StaffUserService {
  private readonly logger = new Logger(StaffUserService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new staff user record with Argon2 password hashing.
   */
  async createStaffUser(
    createDto: CreateStaffUserDto,
  ): Promise<StaffUserResponseDto> {
    const { username, password, first_name, last_name, assigned_role } =
      createDto;

    this.logger.log(`Creating new staff user with username: "${username}"`);

    // Hash password using argon2
    const password_hash = await argon.hash(password);

    try {
      const staff = await this.prisma.staffUser.create({
        data: {
          username: username.trim(),
          password_hash,
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          assigned_role,
        },
      });

      this.logger.log(`Staff user created successfully with ID: ${staff.id}`);

      return StaffUserResponseDto.fromEntity(staff);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.warn(
          `Conflict error: Staff user already exists with username "${username}"`,
        );
        throw new ConflictException(
          `Staff user with username '${username}' already exists.`,
        );
      }

      this.logger.error(
        `Failed to create staff user: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Find a staff user by ID.
   */
  async getStaffByID(id: number): Promise<StaffUserResponseDto> {
    this.logger.log(`Fetching staff user by ID: ${id}`);

    const staff = await this.prisma.staffUser.findUnique({
      where: { id },
    });

    if (!staff) {
      this.logger.warn(`Staff user lookup failed: ID ${id} not found`);
      throw new NotFoundException(`Staff user with ID: ${id} not found.`);
    }

    return StaffUserResponseDto.fromEntity(staff);
  }

  /**
   * Retrieve paginated and indexed list of staff users.
   */
  async getAllStaff(
    queryDto: GetStaffUsersQueryDto,
  ): Promise<PaginatedStaffUsersResponseDto> {
    const { page, limit, search, assigned_role, is_active } = queryDto;
    this.logger.log(
      `Fetching staff users - Page: \({page}, Limit:\){limit}, Search: "${search ?? ''}"`,
    );

    const skip = (page - 1) * limit;

    const where: Prisma.StaffUserWhereInput = {};

    if (assigned_role) {
      where.assigned_role = assigned_role;
    }

    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
      ];
    }

    try {
      const [staffList, total] = await Promise.all([
        this.prisma.staffUser.findMany({
          where,
          skip,
          take: limit,
          orderBy: { id: 'asc' },
        }),
        this.prisma.staffUser.count({ where }),
      ]);

      this.logger.log(
        `Retrieved \({staffList.length} staff users out of\){total} total records.`,
      );

      return PaginatedStaffUsersResponseDto.fromEntities(
        staffList,
        total,
        page,
        limit,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch staff users: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Update an existing staff user record.
   * Hashes updated passwords using Argon2 when provided.
   */
  async updateStaff(
    id: number,
    updateDto: UpdateStaffUserDto,
  ): Promise<StaffUserResponseDto> {
    this.logger.log(`Updating staff user ID: ${id}`);

    // Verify existing user exists
    await this.getStaffByID(id);

    const {
      username,
      password,
      first_name,
      last_name,
      assigned_role,
      is_active,
    } = updateDto;

    const dataToUpdate: Prisma.StaffUserUpdateInput = {};

    if (username !== undefined) {
      dataToUpdate.username = username.trim();
    }

    if (password !== undefined) {
      this.logger.log(
        `Hashing new password for staff user ID: ${id} using Argon2`,
      );
      dataToUpdate.password_hash = await argon.hash(password);
    }

    if (first_name !== undefined) {
      dataToUpdate.first_name = first_name.trim();
    }

    if (last_name !== undefined) {
      dataToUpdate.last_name = last_name.trim();
    }

    if (assigned_role !== undefined) {
      dataToUpdate.assigned_role = assigned_role;
    }

    if (is_active !== undefined) {
      dataToUpdate.is_active = is_active;
    }

    try {
      const updatedStaff = await this.prisma.staffUser.update({
        where: { id },
        data: dataToUpdate,
      });

      this.logger.log(`Staff user ID ${id} updated successfully.`);
      return StaffUserResponseDto.fromEntity(updatedStaff);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.warn(
          `Conflict error during update: Username "${username}" is already taken`,
        );
        throw new ConflictException(
          `Staff user with username '${username}' already exists.`,
        );
      }

      this.logger.error(
        `Failed to update staff user ID \({id}:\){(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
