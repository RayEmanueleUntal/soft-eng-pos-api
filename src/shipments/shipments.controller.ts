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
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from 'src/auth/guards';
import { ShipmentsService } from './shipments.service';
import { Idempotent } from 'src/common/decorators';
import { CurrentUser, Roles } from 'src/auth/decorators';
import { AssignedRole as Role } from 'src/generated/prisma/enums';
import {
  CreateShipmentDto,
  GetShipmentsQueryDto,
  PaginatedShipmentsResponseDto,
  ShipmentResponseDto,
  UpdateShipmentDto,
  UpdateShipmentStatusDto,
} from './dto';

@ApiTags('Shipments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  /**
   * Logs forwarder and tracking details for a completed order (Use Case A).
   */
  @Post()
  @Idempotent()
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER, Role.STOCK_MANAGEMENT)
  @ApiOperation({
    summary: 'Log Forwarder/Courier Details for an Order',
    description:
      'Attaches forwarder, consignment tracking number, and notes to a packed order before dispatch. Initial status is set to PENDING.',
  })
  @ApiCreatedResponse({
    description: 'Forwarder details saved. Shipment status set to Pending.',
    type: ShipmentResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input or forwarder is inactive.',
  })
  @ApiNotFoundResponse({
    description: 'Transaction or Forwarder record not found.',
  })
  @ApiConflictResponse({
    description: 'An active shipment already exists for this transaction.',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication token missing or invalid.',
  })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  async createShipment(
    @Body() dto: CreateShipmentDto,
    @CurrentUser() user: { id: number },
  ): Promise<ShipmentResponseDto> {
    return this.shipmentsService.createShipment(dto, user.id);
  }

  /**
   * Retrieves active outward deliveries currently in transit or pending dispatch (Use Case C).
   */
  @Get('active')
  @Roles(
    Role.ADMIN,
    Role.MANAGER,
    Role.SECRETARY,
    Role.CASHIER,
    Role.SALES_CLERK,
    Role.STOCK_MANAGEMENT,
  )
  @ApiOperation({
    summary: 'View List of Active Outward Deliveries',
    description:
      'Retrieves all shipments with status PENDING or DISPATCHED, sorted by dispatch date (oldest first).',
  })
  @ApiOkResponse({
    description: 'Active outward deliveries retrieved successfully.',
    type: PaginatedShipmentsResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication token missing or invalid.',
  })
  async getActiveDeliveries(
    @Query() query: GetShipmentsQueryDto,
  ): Promise<PaginatedShipmentsResponseDto> {
    return this.shipmentsService.getActiveDeliveries(query);
  }

  /**
   * Retrieves historical delivered shipments.
   */
  @Get('history')
  @Roles(
    Role.ADMIN,
    Role.MANAGER,
    Role.SECRETARY,
    Role.CASHIER,
    Role.SALES_CLERK,
    Role.STOCK_MANAGEMENT,
  )
  @ApiOperation({
    summary: 'View Delivery History',
    description:
      'Retrieves all completed shipments with status DELIVERED, sorted by delivery timestamp.',
  })
  @ApiOkResponse({
    description: 'Delivery history retrieved successfully.',
    type: PaginatedShipmentsResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication token missing or invalid.',
  })
  async getDeliveryHistory(
    @Query() query: GetShipmentsQueryDto,
  ): Promise<PaginatedShipmentsResponseDto> {
    return this.shipmentsService.getDeliveryHistory(query);
  }

  /**
   * Retrieves full tracking details for a specific shipment by ID.
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
    summary: 'Get Shipment Details',
    description:
      'Retrieves complete tracking details for a single shipment ID.',
  })
  @ApiParam({ name: 'id', description: 'Shipment ID', example: 1 })
  @ApiOkResponse({
    description: 'Shipment details retrieved successfully.',
    type: ShipmentResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Shipment record not found.' })
  @ApiUnauthorizedResponse({
    description: 'Authentication token missing or invalid.',
  })
  async getShipmentById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ShipmentResponseDto> {
    return this.shipmentsService.getShipmentById(id);
  }

  /**
   * Updates the status of an outbound shipment (Use Case B).
   */
  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.MANAGER, Role.STOCK_MANAGEMENT)
  @ApiOperation({
    summary: 'Update Shipment Status (Pending -> Dispatched -> Delivered)',
    description:
      'Updates status progressing from PENDING to DISPATCHED or DISPATCHED to DELIVERED. Skips are rejected.',
  })
  @ApiParam({ name: 'id', description: 'Shipment ID', example: 1 })
  @ApiOkResponse({
    description: 'Shipment status updated successfully.',
    type: ShipmentResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid status progression (e.g., skipping PENDING to DELIVERED).',
  })
  @ApiNotFoundResponse({ description: 'Shipment record not found.' })
  @ApiUnauthorizedResponse({
    description: 'Authentication token missing or invalid.',
  })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  async updateShipmentStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateShipmentStatusDto,
    @CurrentUser() user: { id: number },
  ): Promise<ShipmentResponseDto> {
    return this.shipmentsService.updateShipmentStatus(id, dto, user.id);
  }

  /**
   * Updates non-status details of a shipment (waybill tracking number, forwarder, notes).
   */
  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.STOCK_MANAGEMENT)
  @ApiOperation({
    summary: 'Update Shipment Details',
    description:
      'Updates waybill number, forwarder, or delivery notes for an active shipment.',
  })
  @ApiParam({ name: 'id', description: 'Shipment ID', example: 1 })
  @ApiOkResponse({
    description: 'Shipment updated successfully.',
    type: ShipmentResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Cannot update details of a delivered shipment or invalid forwarder.',
  })
  @ApiNotFoundResponse({ description: 'Shipment record not found.' })
  @ApiUnauthorizedResponse({
    description: 'Authentication token missing or invalid.',
  })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  async updateShipment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateShipmentDto,
    @CurrentUser() user: { id: number },
  ): Promise<ShipmentResponseDto> {
    return this.shipmentsService.updateShipment(id, dto, user.id);
  }

  /**
   * Cancels/Deletes a shipment entry.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Delete/Cancel Shipment Record',
    description:
      'Permanently removes a shipment entry. Restricted to Admin and Manager.',
  })
  @ApiParam({ name: 'id', description: 'Shipment ID', example: 1 })
  @ApiNotFoundResponse({ description: 'Shipment record not found.' })
  @ApiUnauthorizedResponse({
    description: 'Authentication token missing or invalid.',
  })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  async deleteShipment(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
  ): Promise<void> {
    return this.shipmentsService.deleteShipment(id, user.id);
  }
}
