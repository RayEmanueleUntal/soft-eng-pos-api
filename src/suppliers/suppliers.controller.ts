import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from 'src/auth/guards';
import { SuppliersService } from './suppliers.service';
import { Idempotent } from 'src/common/decorators';
import { AssignedRole as Role } from 'src/generated/prisma/enums';
import { CurrentUser, Roles } from 'src/auth/decorators';
import {
  CreateSupplierDto,
  GetSuppliersDto,
  PaginatedSuppliersResponseDto,
  SupplierResponseDto,
  UpdateSupplierDto,
} from './dto';

@ApiTags('Suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  /**
   * Endpoint for creating a new supplier profile.
   */
  @Post()
  @Idempotent()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STOCK_MANAGEMENT)
  @ApiOperation({
    summary: 'Create supplier profile',
    description: 'Registers a new supplier.',
  })
  @ApiCreatedResponse({
    description: 'Supplier successfully created',
    type: SupplierResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'JWT authentication required' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  async create(
    @Body() dto: CreateSupplierDto,
    @CurrentUser() user: { id: number },
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.create(dto, user.id);
  }

  /**
   * Endpoint for fetching suppliers list.
   * Supports pagination, search queries, and active/inactive status filters.
   */
  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SECRETARY, Role.STOCK_MANAGEMENT)
  @ApiOperation({
    summary: 'Get list of suppliers',
    description:
      'Retrieves paginated list of suppliers with optional search and active status filters.',
  })
  @ApiOkResponse({
    description: 'Suppliers retrieved',
    type: PaginatedSuppliersResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'JWT authentication required' })
  async findAll(
    @Query() query: GetSuppliersDto,
  ): Promise<PaginatedSuppliersResponseDto> {
    return this.suppliersService.findAll(query);
  }

  /**
   * Endpoint for retrieving a specific supplier profile by ID.
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SECRETARY, Role.STOCK_MANAGEMENT)
  @ApiOperation({
    summary: 'Get supplier by ID',
    description: 'Fetches details of a specific supplier by unique ID.',
  })
  @ApiOkResponse({
    description: 'Supplier details found',
    type: SupplierResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Supplier ID not found' })
  @ApiUnauthorizedResponse({ description: 'JWT authentication required' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.findOne(id);
  }

  /**
   * Endpoint for updating supplier information or toggling active status.
   */
  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.STOCK_MANAGEMENT)
  @ApiOperation({
    summary: 'Update supplier profile',
    description: 'Updates supplier information or toggles active status.',
  })
  @ApiOkResponse({
    description: 'Supplier updated successfully',
    type: SupplierResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Supplier ID not found' })
  @ApiBadRequestResponse({ description: 'Invalid input payload' })
  @ApiUnauthorizedResponse({ description: 'JWT authentication required' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupplierDto,
    @CurrentUser() user: { id: number },
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.update(id, dto, user.id);
  }

  /**
   * Endpoint for deleting or deactivating a supplier.
   * Rejects deletion with ConflictException (409) and automatically deactivates supplier if linked POs exist.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Delete or deactivate supplier',
    description:
      'Permanently deletes unlinked suppliers. Automatically deactivates suppliers that have linked Purchase Orders.',
  })
  @ApiOkResponse({
    description: 'Supplier deleted or deactivated successfully',
  })
  @ApiNotFoundResponse({ description: 'Supplier ID not found' })
  @ApiConflictResponse({
    description: 'Supplier linked to Purchase Orders; auto-deactivated instead',
  })
  @ApiUnauthorizedResponse({ description: 'JWT authentication required' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
  ): Promise<{ message: string }> {
    return this.suppliersService.remove(id, user.id);
  }
}
