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
import { PurchaseOrdersService } from './purchase-orders.service';
import { CurrentUser, Roles } from 'src/auth/decorators';
import { AssignedRole as Role } from 'src/generated/prisma/enums';
import { Idempotent } from 'src/common/decorators';
import {
  CreatePurchaseOrderDto,
  GetPurchaseOrdersQueryDto,
  PaginatedPurchaseOrdersResponseDto,
  PurchaseOrderResponseDto,
  UpdatePOStatusDto,
} from './dto';

@ApiTags('Purchase Orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  /**
   * HTTP POST Endpoint for generating a new Purchase Order with line items.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ADMIN, Role.MANAGER, Role.STOCK_MANAGEMENT, Role.SECRETARY)
  @Idempotent()
  @ApiOperation({
    summary: 'Generate a new Purchase Order',
    description:
      'Creates a new Purchase Order record with line items for an active supplier. Products do not need to be below Reorder Point (ROP) to be included.',
  })
  @ApiCreatedResponse({
    description: 'Purchase Order created successfully.',
    type: PurchaseOrderResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Validation failed or business domain rule violated (e.g., inactive supplier, missing product IDs, or zero/negative quantity).',
    schema: {
      examples: {
        InactiveSupplier: {
          summary: 'Inactive Supplier',
          value: {
            statusCode: 400,
            error: 'Bad Request',
            message:
              "Supplier 'Acme Fasteners' (ID: 5) is inactive and cannot receive new purchase orders.",
          },
        },
        ProductsNotFound: {
          summary: 'Missing Products',
          value: {
            statusCode: 400,
            error: 'Bad Request',
            message: 'The following product IDs do not exist: 999, 1000',
            missingProductIds: [999, 1000],
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'The specified supplier ID was not found.',
    schema: {
      example: {
        statusCode: 404,
        error: 'Not Found',
        message: 'Supplier with ID 5 was not found.',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication credentials missing or invalid.',
  })
  @ApiForbiddenResponse({
    description: 'User does not possess the required RBAC role.',
  })
  async createPurchaseOrder(
    @Body() dto: CreatePurchaseOrderDto,
    @CurrentUser() user: { id: number },
  ): Promise<PurchaseOrderResponseDto> {
    return this.purchaseOrdersService.createPurchaseOrder(dto, user.id);
  }

  /**
   * HTTP GET Endpoint for retrieving a paginated list of Purchase Orders with optional filters.
   */
  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STOCK_MANAGEMENT, Role.SECRETARY)
  @ApiOperation({
    summary: 'Get all Purchase Orders (Paginated)',
    description:
      'Retrieves a paginated list of Purchase Orders with optional filtering by status, supplier ID, or order date range.',
  })
  @ApiOkResponse({
    description: 'Purchase Orders list retrieved successfully.',
    type: PaginatedPurchaseOrdersResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication credentials missing or invalid.',
  })
  @ApiForbiddenResponse({
    description: 'User does not possess the required RBAC role.',
  })
  async getAllPurchaseOrders(
    @Query() query: GetPurchaseOrdersQueryDto,
  ): Promise<PaginatedPurchaseOrdersResponseDto> {
    return this.purchaseOrdersService.getAllPurchaseOrders(query);
  }

  /**
   * HTTP GET Endpoint for retrieving a single Purchase Order by its ID.
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.STOCK_MANAGEMENT, Role.SECRETARY)
  @ApiOperation({
    summary: 'Get Purchase Order by ID',
    description: 'Fetches details and line items of a specific Purchase Order.',
  })
  @ApiOkResponse({
    description: 'Purchase Order details retrieved successfully.',
    type: PurchaseOrderResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Purchase Order with given ID was not found.',
    schema: {
      example: {
        statusCode: 404,
        error: 'Not Found',
        message: 'Purchase Order with ID 12 was not found.',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication credentials missing or invalid.',
  })
  @ApiForbiddenResponse({
    description: 'User does not possess the required RBAC role.',
  })
  async getPurchaseOrderById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PurchaseOrderResponseDto> {
    return this.purchaseOrdersService.getPurchaseOrderById(id);
  }

  /**
   * HTTP PATCH Endpoint for updating the status of an existing Purchase Order.
   */
  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.MANAGER, Role.STOCK_MANAGEMENT)
  @ApiOperation({
    summary: 'Update Purchase Order status',
    description:
      'Updates status (e.g., cancelling a PENDING purchase order). Orders that are in terminal states (FULFILLED, CANCELLED) or have associated deliveries cannot be cancelled.',
  })
  @ApiOkResponse({
    description: 'Purchase Order status updated successfully.',
    type: PurchaseOrderResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Status update rejected due to immutability rules on terminal states.',
    schema: {
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message:
          "Purchase Order 12 cannot be modified because its current status is 'FULFILLED'.",
      },
    },
  })
  @ApiConflictResponse({
    description:
      'Conflict error when attempting to cancel an order with existing received deliveries.',
    schema: {
      example: {
        statusCode: 409,
        error: 'Conflict',
        message:
          'Cannot cancel Purchase Order 12 because 2 delivery/deliveries have already been received against it.',
        poId: 12,
        deliveryCount: 2,
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Purchase Order with given ID was not found.',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication credentials missing or invalid.',
  })
  @ApiForbiddenResponse({
    description: 'User does not possess the required RBAC role.',
  })
  async updatePurchaseOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePOStatusDto,
  ): Promise<PurchaseOrderResponseDto> {
    return this.purchaseOrdersService.updatePurchaseOrderStatus(id, dto);
  }
}
