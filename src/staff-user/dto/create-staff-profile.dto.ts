import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { AssignedRole } from 'src/generated/prisma/enums';

export class CreateStaffProfileDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @IsString()
  @IsNotEmpty()
  last_name!: string;

  @IsEnum(AssignedRole, {
    message: `Role must be one of the following values: ${Object.values(AssignedRole).join(', ')}`,
  })
  assignedRole!: AssignedRole;
}

/*
id            Int          @id @default(autoincrement())
  username      String       @unique
  password_hash String
  first_name    String
  last_name     String
  assigned_role AssignedRole
  is_active     Boolean      @default(true)

  transactions   Transaction[]
  stockMovements StockMovement[]
  purchaseOrders PurchaseOrder[]
  deliveries     Delivery[]
  returns        Return[]

*/
