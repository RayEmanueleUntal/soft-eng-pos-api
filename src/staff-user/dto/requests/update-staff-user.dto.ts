import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { AssignedRole } from 'src/generated/prisma/enums';

export class UpdateStaffUserDto {
  @ApiPropertyOptional({
    example: 'jsmith',
    description: 'Updated unique username',
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({
    example: 'NewStrongP@ssw0rd!',
    description: 'New password if updating (will be hashed)',
    minLength: 6,
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({
    example: 'John',
    description: 'Updated first name',
  })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional({
    example: 'Smith',
    description: 'Updated last name',
  })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional({
    enum: AssignedRole,
    example: AssignedRole.MANAGER,
    description: 'Updated assigned role',
  })
  @IsOptional()
  @IsEnum(AssignedRole)
  assigned_role?: AssignedRole;

  @ApiPropertyOptional({
    example: true,
    description: 'Set staff user active status',
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
