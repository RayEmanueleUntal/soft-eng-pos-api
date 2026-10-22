import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateForwarderDto,
  ForwarderResponseDto,
  GetForwardersQueryDto,
  PaginatedForwardersResponseDto,
  UpdateForwarderDto,
} from './dto';
import {
  ForwarderAlreadyExistsException,
  ForwarderNotFoundException,
} from 'src/common/exceptions';

@Injectable()
export class ForwarderService {
  private readonly logger = new Logger(ForwarderService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registers a new freight forwarder or courier company in the system directory.
   */
  async createForwarder(
    dto: CreateForwarderDto,
    userId: number,
  ): Promise<ForwarderResponseDto> {
    this.logger.log(
      `Creating forwarder: company_name=${dto.company_name}, requestedBy=${userId}`,
    );

    const existing = await this.prisma.forwarder.findFirst({
      where: {
        company_name: { equals: dto.company_name, mode: 'insensitive' },
      },
    });

    if (existing) {
      this.logger.warn(
        `Forwarder creation failed. Duplicate name: ${dto.company_name}`,
      );
      throw new ForwarderAlreadyExistsException(dto.company_name);
    }

    const forwarder = await this.prisma.forwarder.create({
      data: {
        company_name: dto.company_name.trim(),
        tracking_contact_info: dto.tracking_contact_info.trim(),
      },
    });

    this.logger.log(`Forwarder created successfully: id=${forwarder.id}`);
    return ForwarderResponseDto.fromEntity(forwarder);
  }

  /**
   * Retrieves a paginated list of forwarders with optional search and active status filters.
   */
  async findAllForwarders(
    query: GetForwardersQueryDto,
  ): Promise<PaginatedForwardersResponseDto> {
    const { search, is_active, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    if (search) {
      where.OR = [
        { company_name: { contains: search, mode: 'insensitive' } },
        { tracking_contact_info: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, forwarders] = await Promise.all([
      this.prisma.forwarder.count({ where }),
      this.prisma.forwarder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { company_name: 'asc' },
      }),
    ]);

    return {
      data: forwarders.map(ForwarderResponseDto.fromEntity),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves a single forwarder by ID.
   */
  async findForwarderById(id: number): Promise<ForwarderResponseDto> {
    const forwarder = await this.prisma.forwarder.findUnique({ where: { id } });

    if (!forwarder) {
      throw new ForwarderNotFoundException(id);
    }

    return ForwarderResponseDto.fromEntity(forwarder);
  }

  /**
   * Updates an existing forwarder's contact details, name, or active status.
   */
  async updateForwarder(
    id: number,
    dto: UpdateForwarderDto,
    userId: number,
  ): Promise<ForwarderResponseDto> {
    this.logger.log(`Updating forwarder: id=${id}, requestedBy=${userId}`);

    const existing = await this.prisma.forwarder.findUnique({ where: { id } });
    if (!existing) {
      throw new ForwarderNotFoundException(id);
    }

    if (
      dto.company_name &&
      dto.company_name.toLowerCase() !== existing.company_name.toLowerCase()
    ) {
      const duplicate = await this.prisma.forwarder.findFirst({
        where: {
          company_name: { equals: dto.company_name, mode: 'insensitive' },
        },
      });

      if (duplicate) {
        this.logger.warn(
          `Forwarder update failed. Duplicate name: ${dto.company_name}`,
        );
        throw new ForwarderAlreadyExistsException(dto.company_name);
      }
    }

    const updated = await this.prisma.forwarder.update({
      where: { id },
      data: {
        ...(dto.company_name && { company_name: dto.company_name.trim() }),
        ...(dto.tracking_contact_info && {
          tracking_contact_info: dto.tracking_contact_info.trim(),
        }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
      },
    });

    this.logger.log(`Forwarder updated successfully: id=${id}`);
    return ForwarderResponseDto.fromEntity(updated);
  }

  /**
   * Removes or deactivates a forwarder profile.
   * Hybrid Delete Logic:
   * - Hard deletes if no shipments are linked.
   * - Soft deletes (sets is_active = false) if shipments exist to maintain database referential integrity.
   */
  async deleteForwarder(
    id: number,
    userId: number,
  ): Promise<{ message: string; softDeleted: boolean }> {
    this.logger.log(
      `Deleting forwarder request: id=${id}, requestedBy=${userId}`,
    );

    const forwarder = await this.prisma.forwarder.findUnique({
      where: { id },
      include: { _count: { select: { shipments: true } } },
    });

    if (!forwarder) {
      throw new ForwarderNotFoundException(id);
    }

    const hasShipments = forwarder._count.shipments > 0;

    if (hasShipments) {
      // Soft-delete to preserve shipment transaction history
      await this.prisma.forwarder.update({
        where: { id },
        data: { is_active: false },
      });

      this.logger.log(
        `Forwarder #${id} has ${forwarder._count.shipments} associated shipments. Soft-deleted (is_active=false).`,
      );

      return {
        message: `Forwarder #${id} has associated shipment history and was marked as inactive.`,
        softDeleted: true,
      };
    } else {
      // Hard delete if no relational records exist
      await this.prisma.forwarder.delete({ where: { id } });

      this.logger.log(
        `Forwarder #${id} has no shipment history. Permanently deleted.`,
      );

      return {
        message: `Forwarder #${id} was permanently deleted.`,
        softDeleted: false,
      };
    }
  }
}
