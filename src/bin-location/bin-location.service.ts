import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  BinLocationResponseDto,
  CreateBinLocDto,
  GetBinLocationsQueryDto,
  PaginatedBinLocationsResponseDto,
  SearchBinLocQueryDto,
} from './dto';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class BinLocationService {
  private readonly logger = new Logger(BinLocationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new bin location record.
   */
  async createBinLocation(
    createBinDto: CreateBinLocDto,
  ): Promise<BinLocationResponseDto> {
    const { aisle_number, shelf_location } = createBinDto;
    this.logger.log(
      `Creating bin location - Aisle: "\({aisle_number}", Shelf: "\){shelf_location}"`,
    );

    try {
      const bin = await this.prisma.binLocation.create({
        data: {
          aisle_number: aisle_number.trim(),
          shelf_location: shelf_location.trim(),
        },
      });

      this.logger.log(`Bin location created successfully with ID: ${bin.id}`);
      return BinLocationResponseDto.fromEntity(bin);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.warn(
          `Conflict error: Bin location already exists for Aisle: "\({aisle_number}", Shelf: "\){shelf_location}"`,
        );
        throw new ConflictException(
          `Bin location already exists with Aisle Number: '\({aisle_number}' and Shelf Location: '\){shelf_location}'`,
        );
      }

      this.logger.error(
        `Failed to create bin location: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Find a bin location by its aisle number and shelf location combination.
   * Utilizes the @@unique([aisle_number, shelf_location]) compound index for O(1) lookup.
   */
  async findByAisleAndShelf(
    queryDto: SearchBinLocQueryDto,
  ): Promise<BinLocationResponseDto> {
    const { aisle_number, shelf_location } = queryDto;
    this.logger.log(
      `Searching bin location key for Aisle: "\({aisle_number}", Shelf: "\){shelf_location}"`,
    );

    const bin = await this.prisma.binLocation.findUnique({
      where: {
        aisle_number_shelf_location: {
          aisle_number: aisle_number.trim(),
          shelf_location: shelf_location.trim(),
        },
      },
    });

    if (!bin) {
      this.logger.warn(
        `Bin location not found for Aisle: "\({aisle_number}", Shelf: "\){shelf_location}"`,
      );
      throw new NotFoundException(
        `Bin location with Aisle: '\({aisle_number}' and Shelf: '\){shelf_location}' was not found.`,
      );
    }

    this.logger.log(`Bin location key retrieved successfully (ID: ${bin.id})`);
    return BinLocationResponseDto.fromEntity(bin);
  }

  /**
   * Retrieve paginated and indexed list of bin locations.
   */
  async getAllBinLocations(
    queryDto: GetBinLocationsQueryDto,
  ): Promise<PaginatedBinLocationsResponseDto> {
    const { page, limit, search } = queryDto;
    this.logger.log(
      `Fetching bin locations - Page: \({page}, Limit:\){limit}, Search: "${search ?? ''}"`,
    );

    const skip = (page - 1) * limit;

    const where: Prisma.BinLocationWhereInput = search
      ? {
          OR: [
            { aisle_number: { contains: search, mode: 'insensitive' } },
            { shelf_location: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    try {
      const [binLocations, total] = await Promise.all([
        this.prisma.binLocation.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ aisle_number: 'asc' }, { shelf_location: 'asc' }],
        }),
        this.prisma.binLocation.count({ where }),
      ]);

      this.logger.log(
        `Retrieved \({binLocations.length} bin locations out of\){total} total records.`,
      );

      return PaginatedBinLocationsResponseDto.fromEntities(
        binLocations,
        total,
        page,
        limit,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch bin locations: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
