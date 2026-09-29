import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { StaffUserService } from './staff-user.service';
import { JwtAuthGuard, RolesGuard } from 'src/auth/guards';
import { AssignedRole as Role } from 'src/generated/prisma/enums';
import { Roles } from 'src/auth/decorators';
import {
  CreateStaffUserDto,
  GetStaffUsersQueryDto,
  PaginatedStaffUsersResponseDto,
  StaffUserResponseDto,
  UpdateStaffUserDto,
} from './dto';
import { Idempotent } from 'src/common/decorators';

@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Staff Users')
@Controller('staff-users')
export class StaffUserController {
  constructor(private readonly staffUsersService: StaffUserService) {}

  @Post()
  @Idempotent()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Create a new staff user',
    description: 'Registers a new staff member account with an assigned role.',
  })
  @ApiCreatedResponse({
    type: StaffUserResponseDto,
    description: 'Staff user created successfully.',
  })
  @ApiConflictResponse({
    description: 'A staff user with the provided username already exists.',
  })
  async createStaffUser(
    @Body() createDto: CreateStaffUserDto,
  ): Promise<StaffUserResponseDto> {
    return this.staffUsersService.createStaffUser(createDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Get paginated list of staff users',
    description:
      'Retrieves staff user records with optional filters for role, search query, and active status.',
  })
  @ApiOkResponse({
    type: PaginatedStaffUsersResponseDto,
    description: 'Paginated staff list retrieved successfully.',
  })
  async getAllStaff(
    @Query() queryDto: GetStaffUsersQueryDto,
  ): Promise<PaginatedStaffUsersResponseDto> {
    return this.staffUsersService.getAllStaff(queryDto);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Get staff user by ID',
    description: 'Retrieves staff user details for a given primary key ID.',
  })
  @ApiOkResponse({
    type: StaffUserResponseDto,
    description: 'Staff user found.',
  })
  @ApiNotFoundResponse({
    description: 'Staff user with the given ID was not found.',
  })
  async getStaffByID(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StaffUserResponseDto> {
    return this.staffUsersService.getStaffByID(id);
  }

  @Patch(':id')
  @Idempotent()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Update staff user',
    description:
      'Updates staff user attributes including role, active status, or credentials.',
  })
  @ApiOkResponse({
    type: StaffUserResponseDto,
    description: 'Staff user updated successfully.',
  })
  @ApiNotFoundResponse({
    description: 'Staff user with the specified ID was not found.',
  })
  @ApiConflictResponse({
    description: 'Updated username conflicts with an existing staff user.',
  })
  async updateStaff(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateStaffUserDto,
  ): Promise<StaffUserResponseDto> {
    return this.staffUsersService.updateStaff(id, updateDto);
  }
}
