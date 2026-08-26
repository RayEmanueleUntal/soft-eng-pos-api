import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiForbiddenResponse, ApiOperation } from '@nestjs/swagger';
import { AssignedRole } from 'src/generated/prisma/enums';

export const ROLES_KEY = 'roles';
// export const Roles = (...roles: AssignedRole[]) =>
//   SetMetadata(ROLES_KEY, roles);

export function Roles(...roles: AssignedRole[]) {
  const roleNames = roles.map((role) => `\`${role}\``).join(', ');

  return applyDecorators(
    SetMetadata(ROLES_KEY, roles),

    ApiOperation({
      description: `**Authorized Roles:** ${roleNames}`,
    }),

    ApiForbiddenResponse({
      description: `Forbidden resource. Missing required role: ${roleNames}`,
    }),
  );
}
