import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSettingDto, SettingResponseDto, UpdateSettingDto } from './dto';
import { SystemSetting } from 'src/generated/prisma/client';

@Injectable()
export class SystemSettingsService {
  private readonly logger = new Logger(SystemSettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSettingDto): Promise<SettingResponseDto> {
    this.logger.log(`Attempting to create setting with key: "${dto.key}"`);

    const existing = await this.prisma.systemSetting.findUnique({
      where: { key: dto.key },
    });

    if (existing) {
      this.logger.warn(
        `Failed to create setting: key "${dto.key}" already exists`,
      );
      throw new ConflictException(
        `Setting with key "${dto.key}" already exists`,
      );
    }

    const setting = await this.prisma.systemSetting.create({
      data: dto,
    });

    this.logger.log(`Successfully created setting "${setting.key}"`);
    return SettingResponseDto.fromEntity(setting);
  }

  async findAll(): Promise<SettingResponseDto[]> {
    this.logger.log('Fetching all system settings');
    const settings = await this.prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });

    this.logger.debug(`Retrieved ${settings.length} system setting(s)`);
    return settings.map((s) => SettingResponseDto.fromEntity(s));
  }

  async findOne(key: string): Promise<SettingResponseDto> {
    this.logger.log(`Fetching setting for key: "${key}"`);

    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      this.logger.warn(`Setting with key "${key}" not found`);
      throw new NotFoundException(`Setting with key "${key}" not found`);
    }

    return SettingResponseDto.fromEntity(setting);
  }

  async update(
    key: string,
    dto: UpdateSettingDto,
  ): Promise<SettingResponseDto> {
    this.logger.log(`Attempting to update setting: "${key}"`);

    await this.findOne(key); // Throws 404 if missing

    const updated = await this.prisma.systemSetting.update({
      where: { key },
      data: dto,
    });

    this.logger.log(`Successfully updated setting "${key}"`);
    return SettingResponseDto.fromEntity(updated);
  }

  async remove(key: string): Promise<SettingResponseDto> {
    this.logger.log(`Attempting to delete setting: "${key}"`);

    await this.findOne(key); // Throws 404 if missing

    const deleted = await this.prisma.systemSetting.delete({
      where: { key },
    });

    this.logger.log(`Successfully deleted setting "${key}"`);
    return SettingResponseDto.fromEntity(deleted);
  }

  // --- Helpers for internal service consumption ---

  async get(key: string, defaultValue?: string): Promise<string> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      if (defaultValue !== undefined) {
        this.logger.warn(
          `Setting "${key}" missing. Fallback to: "${defaultValue}"`,
        );
        return defaultValue;
      }
      this.logger.error(`Required setting "${key}" is missing`);
      throw new NotFoundException(`System setting "${key}" is missing`);
    }

    return setting.value;
  }

  async getNumber(key: string, defaultValue?: number): Promise<number> {
    const rawVal = await this.get(key, defaultValue?.toString());
    const parsedNum = Number(rawVal);

    if (isNaN(parsedNum)) {
      this.logger.error(
        `Setting "${key}" value "${rawVal}" is not a valid number`,
      );
      throw new BadRequestException(
        `System setting "${key}" value "${rawVal}" is not a valid number`,
      );
    }

    return parsedNum;
  }

  async getBoolean(key: string, defaultValue?: boolean): Promise<boolean> {
    const rawVal = await this.get(key, defaultValue?.toString());
    return rawVal.toLowerCase() === 'true' || rawVal === '1';
  }
}
