import { SetMetadata } from '@nestjs/common';
import { AssignedRole } from 'src/generated/prisma/enums';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AssignedRole[]) =>
  SetMetadata(ROLES_KEY, roles);
