import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateSupplierDto,
  GetSuppliersDto,
  PaginatedSuppliersResponseDto,
  SupplierResponseDto,
  UpdateSupplierDto,
} from './dto';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new supplier record.
   * Logs creation audit events and transforms response entity.
   */
  async create(
    dto: CreateSupplierDto,
    userId: number,
  ): Promise<SupplierResponseDto> {
    this.logger.log(
      `Creating supplier: name="${dto.name}" by userId=${userId}`,
    );

    const supplier = await this.prisma.supplier.create({
      data: {
        name: dto.name,
        contact_info: dto.contact_info,
        location: dto.location,
        lead_time_days: dto.lead_time_days,
        is_active: dto.is_active ?? true,
      },
    });

    this.logger.log(`Supplier created successfully: id=${supplier.id}`);
    return SupplierResponseDto.fromEntity(supplier);
  }

  /**
   * Retrieves a paginated list of suppliers.
   * Supports searching by name/location/contact and filtering by active status.
   */
  async findAll(
    query: GetSuppliersDto,
  ): Promise<PaginatedSuppliersResponseDto> {
    const { search, is_active, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // Build dynamic query conditions
    const where: Prisma.SupplierWhereInput = {};

    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contact_info: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Concurrent execution of pagination data and count for high throughput
    const [suppliers, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      data: suppliers.map(SupplierResponseDto.fromEntity),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Fetches a single supplier profile by ID.
   * Throws NotFoundException if supplier record does not exist.
   */
  async findOne(id: number): Promise<SupplierResponseDto> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      this.logger.warn(`Supplier lookup failed: supplierId=${id} not found`);
      throw new NotFoundException(`Supplier with ID ${id} not found.`);
    }

    return SupplierResponseDto.fromEntity(supplier);
  }

  /**
   * Updates an existing supplier profile.
   * Allows updating details or toggling is_active state.
   */
  async update(
    id: number,
    dto: UpdateSupplierDto,
    userId: number,
  ): Promise<SupplierResponseDto> {
    this.logger.log(`Updating supplierId=${id} by userId=${userId}`);

    // Verify record exists before executing update
    await this.findOne(id);

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: dto,
    });

    this.logger.log(`Supplier updated successfully: supplierId=${id}`);
    return SupplierResponseDto.fromEntity(updated);
  }

  /**
   * Safely deactivates or hard-deletes a supplier.
   * Deletion is rejected if historical Purchase Orders exist to prevent relational orphans and data loss.
   */
  async remove(id: number, userId: number): Promise<{ message: string }> {
    this.logger.log(
      `Attempting deletion/deactivation of supplierId=${id} by userId=${userId}`,
    );

    // Fetch supplier along with the count of associated purchase orders
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { purchaseOrders: true },
        },
      },
    });

    if (!supplier) {
      this.logger.warn(`Supplier process failed: supplierId=${id} not found`);
      throw new NotFoundException(`Supplier with ID ${id} not found.`);
    }

    // Business Rule: Hard deletion is prohibited if historical purchase orders exist
    if (supplier._count.purchaseOrders > 0) {
      this.logger.warn(
        `Hard deletion blocked for supplierId=${id} due to ${supplier._count.purchaseOrders} linked purchase orders. Deactivating supplier instead.`,
      );

      // Automatically fall back to deactivating the supplier
      await this.prisma.supplier.update({
        where: { id },
        data: { is_active: false },
      });

      throw new ConflictException(
        `Supplier ID ${id} cannot be deleted because it is linked to historical Purchase Orders. Supplier has been deactivated (is_active = false) instead to preserve audit records.`,
      );
    }

    // Safe to hard delete if 0 linked Purchase Orders exist
    await this.prisma.supplier.delete({
      where: { id },
    });

    this.logger.log(`Unlinked supplier deleted permanently: supplierId=${id}`);
    return { message: `Supplier with ID ${id} has been permanently deleted.` };
  }
}
