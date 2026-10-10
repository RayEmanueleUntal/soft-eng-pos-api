import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from 'src/auth/guards';
import { DeliveriesService } from './deliveries.service';
import { CurrentUser, Roles } from 'src/auth/decorators';
import { AssignedRole as Role } from 'src/generated/prisma/enums';
import { Idempotent } from 'src/common/decorators';
import {
  CreateDeliveryDto,
  DeliveryResponseDto,
  GetDeliveriesQueryDto,
  PaginatedDeliveriesResponseDto,
} from './dto';

@ApiTags('Deliveries')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  /**
   * HTTP POST Endpoint for receiving and verifying a physical delivery against a Purchase Order.
   * Performs stock-in, updates inventory, logs StockMovement audit records, and transitions PO status.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ADMIN, Role.MANAGER, Role.STOCK_MANAGEMENT)
  @Idempotent()
  @ApiOperation({
    summary: 'Process physical delivery receiving against a Purchase Order',
    description:
      'Receives stock items from a supplier delivery, verifies quantities against requested PO line items, atomically updates inventory stock levels, logs stock-in StockMovement records, and updates PO status (PARTIALLY_FULFILLED or FULFILLED).',
  })
  @ApiCreatedResponse({
    description:
      'Delivery recorded and inventory stock levels updated successfully.',
    schema: {
      example: {
        message:
          'Success: Delivery verified and inventory stock levels updated.',
        isPartial: false,
        delivery: {
          id: 1,
          poId: 12,
          delivery_date: '2026-10-10T09:15:00.000Z',
          staffId: 3,
          staffName: 'John Doe',
          deliveryItems: [
            {
              id: 1,
              productId: 101,
              productName: 'Hex Bolt M8-1.25 x 30mm',
              productSku: 'BLT-M8-30-SS',
              received_quantity: 50,
            },
          ],
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Validation failed or business rule violation (e.g., PO not in active status, submitted product not in PO, or missing products).',
    schema: {
      examples: {
        InvalidPOStatus: {
          summary: 'PO not in PENDING/PARTIALLY_FULFILLED state',
          value: {
            statusCode: 400,
            error: 'Bad Request',
            message:
              "Purchase Order #12 is in status 'FULFILLED' and cannot accept deliveries.",
            details: { poId: 12, status: 'FULFILLED' },
          },
        },
        POItemNotFound: {
          summary: 'Submitted product not part of PO',
          value: {
            statusCode: 400,
            error: 'Bad Request',
            message: 'Product ID 99 is not part of Purchase Order #12.',
            details: { poId: 12, productId: 99 },
          },
        },
        ProductsNotFound: {
          summary: 'Submitted product ID does not exist',
          value: {
            statusCode: 400,
            error: 'Bad Request',
            message: 'The following product IDs do not exist: 105, 106',
            missingProductIds: [105, 106],
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Purchase Order record not found in the database.',
    schema: {
      example: {
        statusCode: 404,
        error: 'Not Found',
        message: 'Purchase Order #12 not found.',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid authentication token.',
  })
  @ApiForbiddenResponse({
    description: 'User role lacks permission to process deliveries.',
  })
  async processDelivery(
    @CurrentUser() user: { id: number },
    @Body() dto: CreateDeliveryDto,
  ) {
    return await this.deliveriesService.processDelivery(user.id, dto);
  }

  /**
   * HTTP GET Endpoint for retrieving a paginated list of delivery records with optional filters.
   */
  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STOCK_MANAGEMENT, Role.SECRETARY)
  @ApiOperation({
    summary: 'Get paginated list of deliveries',
    description:
      'Retrieves physical delivery receipts with optional filtering by Purchase Order ID and delivery date range.',
  })
  @ApiOkResponse({
    description: 'Deliveries list retrieved successfully.',
    type: PaginatedDeliveriesResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid authentication token.',
  })
  @ApiForbiddenResponse({
    description: 'User role lacks permission to view deliveries.',
  })
  async findAll(
    @Query() query: GetDeliveriesQueryDto,
  ): Promise<PaginatedDeliveriesResponseDto> {
    return await this.deliveriesService.findAll(query);
  }

  /**
   * HTTP GET Endpoint for fetching a single delivery receipt by ID.
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.STOCK_MANAGEMENT, Role.SECRETARY)
  @ApiOperation({
    summary: 'Get delivery details by ID',
    description:
      'Retrieves single physical delivery record including staff actor details and received items.',
  })
  @ApiOkResponse({
    description: 'Delivery record details retrieved successfully.',
    type: DeliveryResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Delivery record with given ID was not found.',
    schema: {
      example: {
        statusCode: 404,
        error: 'Not Found',
        message: 'Delivery record #99 not found.',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid authentication token.',
  })
  @ApiForbiddenResponse({
    description: 'User role lacks permission to view delivery details.',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DeliveryResponseDto> {
    return await this.deliveriesService.findOne(id);
  }
}
