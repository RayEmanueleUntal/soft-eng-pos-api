import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateShipmentDto,
  GetShipmentsQueryDto,
  UpdateShipmentStatusDto,
  ShipmentResponseDto,
  PaginatedShipmentsResponseDto,
  UpdateShipmentDto,
} from './dto';
import {
  Prisma,
  TrackingStatus,
  TransactionStatus,
} from 'src/generated/prisma/client';
import {
  DuplicateShipmentException,
  InvalidShipmentStatusTransitionException,
  ShipmentNotFoundException,
} from 'src/common/exceptions';

@Injectable()
export class ShipmentsService {
  private readonly logger = new Logger(ShipmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Include relation definitions for standardized Shipment database queries.
   */
  private readonly defaultInclude = {
    forwarder: {
      select: {
        id: true,
        company_name: true,
        tracking_contact_info: true,
      },
    },
    transaction: {
      select: {
        id: true,
        invoice_number: true,
        customer: {
          select: {
            name: true,
          },
        },
      },
    },
  };

  /**
   * Creates/Logs a new outward shipment for a transaction.
   * Performs validation to ensure order exists, is not cancelled, has no active shipment, and forwarder is active.
   */
  async createShipment(
    dto: CreateShipmentDto,
    userId: number,
  ): Promise<ShipmentResponseDto> {
    this.logger.log(
      `Attempting to log shipment for transactionId=${dto.transactionId} by userId=${userId}`,
    );

    // 1. Verify Transaction existence and validity
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: dto.transactionId },
    });

    if (!transaction) {
      this.logger.warn(
        `Shipment creation failed: Transaction ID ${dto.transactionId} not found.`,
      );
      throw new NotFoundException(
        `Order/Transaction record not found for ID ${dto.transactionId}. Please verify transaction details.`,
      );
    }

    if (transaction.status === TransactionStatus.CANCELLED) {
      this.logger.warn(
        `Shipment creation failed: Transaction ID ${dto.transactionId} is cancelled.`,
      );
      throw new BadRequestException(
        `Cannot log shipment for a cancelled transaction.`,
      );
    }

    // 2. Prevent duplicate active shipments for the same transaction
    const existingActiveShipment = await this.prisma.shipment.findFirst({
      where: {
        transactionId: dto.transactionId,
        tracking_status: {
          in: [TrackingStatus.PENDING, TrackingStatus.DISPATCHED],
        },
      },
    });

    if (existingActiveShipment) {
      this.logger.warn(
        `Shipment creation rejected: Active shipment #${existingActiveShipment.id} already exists for transactionId=${dto.transactionId}`,
      );
      throw new DuplicateShipmentException(dto.transactionId);
    }

    // 3. Verify Forwarder existence and active status
    const forwarder = await this.prisma.forwarder.findUnique({
      where: { id: dto.forwarderId },
    });

    if (!forwarder) {
      this.logger.warn(
        `Shipment creation failed: Forwarder ID ${dto.forwarderId} not found.`,
      );
      throw new NotFoundException(
        `Forwarder record not found for ID ${dto.forwarderId}.`,
      );
    }

    if (!forwarder.is_active) {
      this.logger.warn(
        `Shipment creation failed: Forwarder ID ${dto.forwarderId} is inactive.`,
      );
      throw new BadRequestException(
        `Selected forwarder '${forwarder.company_name}' is inactive and cannot be assigned.`,
      );
    }

    // 4. Create Shipment
    const shipment = await this.prisma.shipment.create({
      data: {
        transactionId: dto.transactionId,
        forwarderId: dto.forwarderId,
        tracking_number: dto.tracking_number?.trim() || null,
        notes: dto.notes?.trim() || null,
        tracking_status: TrackingStatus.PENDING,
      },
      include: this.defaultInclude,
    });

    this.logger.log(
      `Shipment created successfully: shipmentId=${shipment.id}, transactionId=${dto.transactionId}, status=PENDING`,
    );

    return ShipmentResponseDto.fromEntity(shipment);
  }

  /**
   * Updates the status of an outbound shipment (PENDING -> DISPATCHED -> DELIVERED).
   * Validates strict status progression flow.
   */
  async updateShipmentStatus(
    id: number,
    dto: UpdateShipmentStatusDto,
    userId: number,
  ): Promise<ShipmentResponseDto> {
    this.logger.log(
      `Attempting status update for shipmentId=${id} to status=${dto.status} by userId=${userId}`,
    );

    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
    });

    if (!shipment) {
      this.logger.warn(`Shipment update status failed: ID ${id} not found.`);
      throw new ShipmentNotFoundException(id);
    }

    // Validate progression rules
    this.validateStatusTransition(shipment.tracking_status, dto.status);

    // Append notes if provided
    let updatedNotes = shipment.notes;
    if (dto.notes && dto.notes.trim()) {
      const timestamp = new Date().toISOString();
      const newNoteEntry = `[${timestamp} Status -> ${dto.status}]: ${dto.notes.trim()}`;
      updatedNotes = shipment.notes
        ? `${shipment.notes}\n${newNoteEntry}`
        : newNoteEntry;
    }

    const updatedShipment = await this.prisma.shipment.update({
      where: { id },
      data: {
        tracking_status: dto.status,
        notes: updatedNotes,
      },
      include: this.defaultInclude,
    });

    this.logger.log(
      `Shipment status updated successfully: shipmentId=${id}, oldStatus=${shipment.tracking_status}, newStatus=${dto.status}`,
    );

    return ShipmentResponseDto.fromEntity(updatedShipment);
  }

  /**
   * Validates allowed status transitions according to business rules.
   * Allowed: PENDING -> DISPATCHED -> DELIVERED
   */
  private validateStatusTransition(
    current: TrackingStatus,
    target: TrackingStatus,
  ): void {
    if (current === target) {
      return; // Idempotent same-status update
    }

    if (current === TrackingStatus.DELIVERED) {
      throw new BadRequestException(
        `Shipment is already delivered and its status cannot be modified.`,
      );
    }

    if (
      current === TrackingStatus.PENDING &&
      target === TrackingStatus.DELIVERED
    ) {
      throw new InvalidShipmentStatusTransitionException(current, target);
    }
  }

  /**
   * Retrieves active outward deliveries (PENDING or DISPATCHED).
   * Sorted by dispatch_date ASC (oldest first) by default as per Use Case C.
   */
  async getActiveDeliveries(
    query: GetShipmentsQueryDto,
  ): Promise<PaginatedShipmentsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ShipmentWhereInput = {
      tracking_status: {
        in: [TrackingStatus.PENDING, TrackingStatus.DISPATCHED],
      },
    };

    if (query.forwarderId) {
      where.forwarderId = query.forwarderId;
    }

    if (query.search && query.search.trim()) {
      const search = query.search.trim();
      where.OR = [
        { tracking_number: { contains: search, mode: 'insensitive' } },
        {
          transaction: {
            invoice_number: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dispatch_date: 'asc' }, // Oldest first as specified in Use Case C
        include: this.defaultInclude,
      }),
      this.prisma.shipment.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      items: items.map((shipment) => ShipmentResponseDto.fromEntity(shipment)),
      meta: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    };
  }

  /**
   * Retrieves shipment delivery history (DELIVERED shipments).
   * Sorted by updatedAt DESC (most recently delivered first).
   */
  async getDeliveryHistory(
    query: GetShipmentsQueryDto,
  ): Promise<PaginatedShipmentsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ShipmentWhereInput = {
      tracking_status: TrackingStatus.DELIVERED,
    };

    if (query.forwarderId) {
      where.forwarderId = query.forwarderId;
    }

    if (query.search && query.search.trim()) {
      const search = query.search.trim();
      where.OR = [
        { tracking_number: { contains: search, mode: 'insensitive' } },
        {
          transaction: {
            invoice_number: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: this.defaultInclude,
      }),
      this.prisma.shipment.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      items: items.map((shipment) => ShipmentResponseDto.fromEntity(shipment)),
      meta: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    };
  }

  /**
   * Retrieves a single shipment by its ID.
   */
  async getShipmentById(id: number): Promise<ShipmentResponseDto> {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: this.defaultInclude,
    });

    if (!shipment) {
      throw new ShipmentNotFoundException(id);
    }

    return ShipmentResponseDto.fromEntity(shipment);
  }

  /**
   * Updates non-status fields (forwarder, tracking_number, notes) of a shipment.
   */
  async updateShipment(
    id: number,
    dto: UpdateShipmentDto,
    userId: number,
  ): Promise<ShipmentResponseDto> {
    this.logger.log(`Updating shipmentId=${id} details by userId=${userId}`);

    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
    });

    if (!shipment) {
      throw new ShipmentNotFoundException(id);
    }

    if (shipment.tracking_status === TrackingStatus.DELIVERED) {
      throw new BadRequestException(
        `Cannot modify details of an already delivered shipment.`,
      );
    }

    if (dto.forwarderId) {
      const forwarder = await this.prisma.forwarder.findUnique({
        where: { id: dto.forwarderId },
      });
      if (!forwarder || !forwarder.is_active) {
        throw new BadRequestException(
          `Specified forwarder is invalid or inactive.`,
        );
      }
    }

    const updated = await this.prisma.shipment.update({
      where: { id },
      data: {
        ...(dto.forwarderId && { forwarderId: dto.forwarderId }),
        ...(dto.tracking_number !== undefined && {
          tracking_number: dto.tracking_number.trim() || null,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes.trim() || null }),
      },
      include: this.defaultInclude,
    });

    this.logger.log(`ShipmentId=${id} updated successfully.`);

    return ShipmentResponseDto.fromEntity(updated);
  }

  /**
   * Deletes/Cancels a shipment record.
   * Restricted to Admin/Manager roles.
   */
  async deleteShipment(id: number, userId: number): Promise<void> {
    this.logger.warn(`Deleting shipmentId=${id} by userId=${userId}`);

    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
    });

    if (!shipment) {
      throw new ShipmentNotFoundException(id);
    }

    await this.prisma.shipment.delete({
      where: { id },
    });

    this.logger.log(`ShipmentId=${id} permanently deleted.`);
  }
}
