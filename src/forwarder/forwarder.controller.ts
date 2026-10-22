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
import { ForwarderService } from './forwarder.service';
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
import { AssignedRole as Role } from 'src/generated/prisma/client';
import { CurrentUser, Roles } from 'src/auth/decorators';
import {
  CreateForwarderDto,
  ForwarderResponseDto,
  GetForwardersQueryDto,
  PaginatedForwardersResponseDto,
  UpdateForwarderDto,
} from './dto';
import { Idempotent } from 'src/common/decorators';

@ApiTags('Forwarders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('forwarders')
export class ForwarderController {
  constructor(private readonly forwarderService: ForwarderService) {}

  /**
   * Registers a new freight forwarder or courier.
   * Access: ADMIN, MANAGER.
   */
  @Post()
  @Idempotent()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Register a new courier / freight forwarder',
    description:
      'Registers a third-party courier company for dispatch assignments.',
  })
  @ApiCreatedResponse({
    description: 'Forwarder successfully registered.',
    type: ForwarderResponseDto,
  })
  @ApiConflictResponse({
    description:
      'A forwarder with this company name already exists. (ForwarderAlreadyExistsException)',
  })
  @ApiBadRequestResponse({ description: 'Invalid input payload.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token.' })
  @ApiForbiddenResponse({
    description: 'User does not possess ADMIN or MANAGER roles.',
  })
  async createForwarder(
    @CurrentUser() user: { id: number },
    @Body() dto: CreateForwarderDto,
  ): Promise<ForwarderResponseDto> {
    return await this.forwarderService.createForwarder(dto, user.id);
  }

  /**
   * Retrieves a paginated list of forwarders.
   * Access: All authenticated staff.
   */
  @Get()
  @Roles(
    Role.ADMIN,
    Role.MANAGER,
    Role.SECRETARY,
    Role.CASHIER,
    Role.SALES_CLERK,
    Role.STOCK_MANAGEMENT,
  )
  @ApiOperation({
    summary: 'Get paginated list of registered forwarders',
    description:
      'Returns forwarder profiles filtered by active state or search query.',
  })
  @ApiOkResponse({
    description: 'List of forwarders retrieved successfully.',
    type: PaginatedForwardersResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token.' })
  async findAllForwarders(
    @Query() query: GetForwardersQueryDto,
  ): Promise<PaginatedForwardersResponseDto> {
    return await this.forwarderService.findAllForwarders(query);
  }

  /**
   * Fetches a single forwarder by ID.
   * Access: All authenticated staff.
   */
  @Get(':id')
  @Roles(
    Role.ADMIN,
    Role.MANAGER,
    Role.SECRETARY,
    Role.CASHIER,
    Role.SALES_CLERK,
    Role.STOCK_MANAGEMENT,
  )
  @ApiOperation({
    summary: 'Get forwarder details by ID',
    description: 'Retrieves single forwarder company record.',
  })
  @ApiOkResponse({
    description: 'Forwarder details retrieved successfully.',
    type: ForwarderResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Forwarder ID not found. (ForwarderNotFoundException)',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token.' })
  async findForwarderById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ForwarderResponseDto> {
    return await this.forwarderService.findForwarderById(id);
  }

  /**
   * Updates an existing forwarder profile.
   * Access: ADMIN, MANAGER.
   */
  @Patch(':id')
  @Idempotent()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Update forwarder profile',
    description: 'Updates forwarder contact details or toggles active status.',
  })
  @ApiOkResponse({
    description: 'Forwarder profile updated successfully.',
    type: ForwarderResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Forwarder ID not found. (ForwarderNotFoundException)',
  })
  @ApiConflictResponse({
    description:
      'Updated company name conflicts with existing forwarder. (ForwarderAlreadyExistsException)',
  })
  @ApiForbiddenResponse({
    description: 'User does not possess ADMIN or MANAGER roles.',
  })
  async updateForwarder(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
    @Body() dto: UpdateForwarderDto,
  ): Promise<ForwarderResponseDto> {
    return await this.forwarderService.updateForwarder(id, dto, user.id);
  }

  /**
   * Deletes or deactivates a forwarder.
   * Access: ADMIN, MANAGER.
   */
  @Delete(':id')
  @Idempotent()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Delete or deactivate a forwarder',
    description:
      'Permanently deletes the forwarder if no shipments exist. Soft-deletes (is_active=false) if shipments are attached.',
  })
  @ApiOkResponse({
    description: 'Forwarder deleted or marked inactive successfully.',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Forwarder #1 was permanently deleted.',
        },
        softDeleted: { type: 'boolean', example: false },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Forwarder ID not found. (ForwarderNotFoundException)',
  })
  @ApiForbiddenResponse({
    description: 'User does not possess ADMIN or MANAGER roles.',
  })
  async deleteForwarder(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
  ) {
    return await this.forwarderService.deleteForwarder(id, user.id);
  }
}
