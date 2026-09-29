import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { AssignedRole } from 'src/generated/prisma/enums';

export class CreateStaffUserDto {
  @ApiProperty({
    example: 'jsmith',
    description: 'Unique username for staff login',
  })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({
    example: 'StrongP@ssw0rd!',
    description: 'Plaintext password (will be hashed using Argon2)',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({
    example: 'John',
    description: 'Staff member first name',
  })
  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @ApiProperty({
    example: 'Smith',
    description: 'Staff member last name',
  })
  @IsString()
  @IsNotEmpty()
  last_name!: string;

  @ApiProperty({
    enum: AssignedRole,
    example: AssignedRole.CASHIER,
    description: 'Role assigned to the staff member',
  })
  @IsEnum(AssignedRole)
  assigned_role!: AssignedRole;
}
