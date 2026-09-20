import {
  Body,
  Controller,
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
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApprovalService } from './approval.service';
import {
  ApprovalRequestResponseDto,
  CreateApprovalRequestDto,
  ReviewApprovalRequestDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from 'src/auth/guards';
import {
  RequestStatus,
  RequestType,
  AssignedRole as Role,
} from 'src/generated/prisma/enums';
import { CurrentUser } from 'src/auth/decorators';
import { Idempotent } from 'src/common/decorators';

@ApiTags('Approval Requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('approval')
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  /*
    Create a request
  */
  @Post()
  @Idempotent()
  @ApiOperation({ summary: 'Create a new approval request (Cashier/Staff)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: ApprovalRequestResponseDto,
    description: 'Approval request submitted successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid payload or unhandled request type',
  })
  async create(
    @CurrentUser() user: { id: number },
    @Body() createDto: CreateApprovalRequestDto,
  ): Promise<ApprovalRequestResponseDto> {
    return this.approvalService.createRequest(createDto, user.id);
  }

  /*
    Get all approval requests (Filterable by status or type)
  */
  @Get()
  @ApiOperation({
    summary: 'Get all approval requests (Filterable by status or type)',
  })
  @ApiQuery({ name: 'status', enum: RequestStatus, required: false })
  @ApiQuery({ name: 'type', enum: RequestType, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [ApprovalRequestResponseDto],
  })
  async findAll(
    @Query('status') status?: RequestStatus,
    @Query('type') type?: RequestType,
  ): Promise<ApprovalRequestResponseDto[]> {
    return this.approvalService.findAll({ status, type });
  }

  /*
    Get an approval request by ID
  */
  @Get(':id')
  @ApiOperation({ summary: 'Get an approval request by ID' })
  @ApiParam({ name: 'id', example: 101 })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ApprovalRequestResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Approval request not found',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApprovalRequestResponseDto> {
    return this.approvalService.findOne(id);
  }

  /*
    Approve a pending request
  */
  @Patch(':id/approve')
  @Idempotent()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a pending request (Manager only)' })
  @ApiParam({ name: 'id', example: 101 })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ApprovalRequestResponseDto,
    description: 'Request approved and domain action executed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Request is already processed or domain execution failed',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Approval request not found',
  })
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
  ): Promise<ApprovalRequestResponseDto> {
    return this.approvalService.approveRequest(id, user.id);
  }

  /*
    Reject a pending request
  */
  @Patch(':id/reject')
  @Idempotent()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a pending request (Manager only)' })
  @ApiParam({ name: 'id', example: 101 })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ApprovalRequestResponseDto,
    description: 'Request rejected',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Request is already processed',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Approval request not found',
  })
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
    @Body() reviewDto: ReviewApprovalRequestDto,
  ): Promise<ApprovalRequestResponseDto> {
    return this.approvalService.rejectRequest(id, user.id, reviewDto);
  }
}
