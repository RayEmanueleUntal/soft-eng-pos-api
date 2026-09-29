import { ApiProperty } from '@nestjs/swagger';
import { AssignedRole } from 'src/generated/prisma/enums';

export class StaffUserResponseDto {
  @ApiProperty({ example: 1, description: 'Unique staff user ID' })
  id!: number;

  @ApiProperty({ example: 'jsmith', description: 'Unique login username' })
  username!: string;

  @ApiProperty({ example: 'John', description: 'Staff first name' })
  first_name!: string;

  @ApiProperty({ example: 'Smith', description: 'Staff last name' })
  last_name!: string;

  @ApiProperty({ enum: AssignedRole, example: AssignedRole.CASHIER })
  assigned_role!: AssignedRole;

  @ApiProperty({ example: true, description: 'Indicates if account is active' })
  is_active!: boolean;

  static fromEntity(entity: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    assigned_role: AssignedRole;
    is_active: boolean;
  }): StaffUserResponseDto {
    return {
      id: entity.id,
      username: entity.username,
      first_name: entity.first_name,
      last_name: entity.last_name,
      assigned_role: entity.assigned_role,
      is_active: entity.is_active,
    };
  }
}
