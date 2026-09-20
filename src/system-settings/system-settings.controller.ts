import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from 'src/auth/guards';
import { CreateSettingDto, SettingResponseDto, UpdateSettingDto } from './dto';
import { Roles } from 'src/auth/decorators';
import { AssignedRole as Role } from 'src/generated/prisma/enums';
import { Idempotent } from 'src/common/decorators';

@ApiTags('System Settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('system-settings')
@Roles(Role.ADMIN, Role.MANAGER)
export class SystemSettingsController {
  constructor(private readonly systemSettingsService: SystemSettingsService) {}

  /*
    Create a new system setting
  */
  @Post()
  @Idempotent()
  @ApiOperation({ summary: 'Create a new system setting' })
  @ApiResponse({ status: HttpStatus.CREATED, type: SettingResponseDto })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Key already exists',
  })
  create(
    @Body() createSettingDto: CreateSettingDto,
  ): Promise<SettingResponseDto> {
    return this.systemSettingsService.create(createSettingDto);
  }

  /*
    Retrieve all settings
  */
  @Get()
  @ApiOperation({ summary: 'Get all system settings' })
  @ApiResponse({ status: HttpStatus.OK, type: [SettingResponseDto] })
  findAll(): Promise<SettingResponseDto[]> {
    return this.systemSettingsService.findAll();
  }

  /*
    Get a system setting by key
  */
  @Get(':key')
  @Idempotent()
  @ApiOperation({ summary: 'Get a specific system setting by key' })
  @ApiParam({ name: 'key', example: 'RETURN_WINDOW_DAYS' })
  @ApiResponse({ status: HttpStatus.OK, type: SettingResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Setting not found',
  })
  findOne(@Param('key') key: string): Promise<SettingResponseDto> {
    return this.systemSettingsService.findOne(key);
  }

  /*
    Update a setting value by key
  */
  @Patch(':key')
  @Idempotent()
  @ApiOperation({ summary: 'Update an existing system setting' })
  @ApiParam({ name: 'key', example: 'RETURN_WINDOW_DAYS' })
  @ApiResponse({ status: HttpStatus.OK, type: SettingResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Setting not found',
  })
  update(
    @Param('key') key: string,
    @Body() updateSettingDto: UpdateSettingDto,
  ): Promise<SettingResponseDto> {
    return this.systemSettingsService.update(key, updateSettingDto);
  }

  /*
    Delete a setting
  */
  @Delete(':key')
  @Idempotent()
  @ApiOperation({ summary: 'Delete a system setting' })
  @ApiParam({ name: 'key', example: 'RETURN_WINDOW_DAYS' })
  @ApiResponse({ status: HttpStatus.OK, type: SettingResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Setting not found',
  })
  remove(@Param('key') key: string) {
    return this.systemSettingsService.remove(key);
  }
}
