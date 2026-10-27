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
   * Creates a new vendor record.
   * Checks for duplicate supplier names before creating.
   */
  async create(
    dto: CreateSupplierDto,
    userId: number,
  ): Promise<SupplierResponseDto> {
    this.logger.log(
      `Creating supplier: name="${dto.name}" by userId=${userId}`,
    );

    const existing = await this.prisma.supplier.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      this.logger.warn(
        `Supplier creation failed: name="${dto.name}" already exists`,
      );
      throw new ConflictException(
        `Supplier with name "${dto.name}" already exists.`,
      );
    }

    const supplier = await this.prisma.supplier.create({
      data: {
        name: dto.name,
        contact_person: dto.contact_person,
        email: dto.email,
        contact_number: dto.contact_number,
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
   * Supports filtering by active state and searching name, contact person, email, and location.
   */
  async findAll(
    query: GetSuppliersDto,
  ): Promise<PaginatedSuppliersResponseDto> {
    const { search, is_active, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = {};

    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contact_person: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

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
   * Retrieves a single supplier entity by unique ID.
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
   * Updates an existing supplier record.
   * Ensures name uniqueness when the supplier name is updated.
   */
  async update(
    id: number,
    dto: UpdateSupplierDto,
    userId: number,
  ): Promise<SupplierResponseDto> {
    this.logger.log(`Updating supplierId=${id} by userId=${userId}`);

    await this.findOne(id);

    if (dto.name) {
      const existingName = await this.prisma.supplier.findUnique({
        where: { name: dto.name },
      });

      if (existingName && existingName.id !== id) {
        this.logger.warn(
          `Supplier update failed: name="${dto.name}" taken by supplierId=${existingName.id}`,
        );
        throw new ConflictException(
          `Supplier with name "${dto.name}" already exists.`,
        );
      }
    }

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: dto,
    });

    this.logger.log(`Supplier updated successfully: supplierId=${id}`);
    return SupplierResponseDto.fromEntity(updated);
  }

  /**
   * Deletes or deactivates a supplier record.
   * Automatically falls back to soft deactivation if historical purchase orders exist[cite: 1].
   */
  async remove(id: number, userId: number): Promise<{ message: string }> {
    this.logger.log(
      `Attempting deletion/deactivation of supplierId=${id} by userId=${userId}`,
    );

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

    // Historical linkage rule: Deactivate if POs exist to prevent relational breakage[cite: 1]
    if (supplier._count.purchaseOrders > 0) {
      this.logger.warn(
        `Hard deletion blocked for supplierId=${id} due to ${supplier._count.purchaseOrders} linked purchase orders. Deactivating supplier.`,
      );

      await this.prisma.supplier.update({
        where: { id },
        data: { is_active: false },
      });

      throw new ConflictException(
        `Supplier ID ${id} cannot be deleted because it is linked to historical Purchase Orders. The supplier has been set to inactive instead.`,
      );
    }

    await this.prisma.supplier.delete({
      where: { id },
    });

    this.logger.log(`Unlinked supplier permanently removed: supplierId=${id}`);
    return { message: `Supplier with ID ${id} has been permanently deleted.` };
  }
}
