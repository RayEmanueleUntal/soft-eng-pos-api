import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { BinLocationService } from './bin-location.service';
import {
  BinLocationResponseDto,
  CreateBinLocDto,
  GetBinLocationsQueryDto,
  PaginatedBinLocationsResponseDto,
  SearchBinLocQueryDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from 'src/auth/guards';
import { Roles } from 'src/auth/decorators';
import { AssignedRole as Role } from 'src/generated/prisma/enums';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Bin Locations')
@Controller('bin-location')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BinLocationController {
  constructor(private readonly binLocationService: BinLocationService) {}

  @Roles(Role.ADMIN, Role.MANAGER, Role.SECRETARY)
  @Post()
  @ApiOperation({
    summary: 'Create a bin location',
    description: 'Registers a unique aisle and shelf combination.',
  })
  @ApiCreatedResponse({
    type: BinLocationResponseDto,
    description: 'Bin location created successfully.',
  })
  @ApiConflictResponse({
    description:
      'Bin location with the specified aisle and shelf already exists.',
  })
  async createBinLocation(
    @Body() createBinDto: CreateBinLocDto,
  ): Promise<BinLocationResponseDto> {
    return this.binLocationService.createBinLocation(createBinDto);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Find bin location ID/key by aisle and shelf',
    description:
      'Looks up a specific bin location by exact aisle number and shelf location to retrieve its primary key ID.',
  })
  @ApiOkResponse({
    type: BinLocationResponseDto,
    description: 'Bin location found.',
  })
  @ApiNotFoundResponse({
    description: 'Bin location with the specified parameters does not exist.',
  })
  async findByAisleAndShelf(
    @Query() queryDto: SearchBinLocQueryDto,
  ): Promise<BinLocationResponseDto> {
    return this.binLocationService.findByAisleAndShelf(queryDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get paginated list of bin locations',
    description: 'Retrieves all bin locations ordered by aisle and shelf.',
  })
  @ApiOkResponse({
    type: PaginatedBinLocationsResponseDto,
    description: 'Paginated list of bin locations retrieved successfully.',
  })
  async getAllBinLocations(
    @Query() queryDto: GetBinLocationsQueryDto,
  ): Promise<PaginatedBinLocationsResponseDto> {
    return this.binLocationService.getAllBinLocations(queryDto);
  }
}
