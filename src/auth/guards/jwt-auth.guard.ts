import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { AssignedRole } from 'src/generated/prisma/enums';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Check if we are NOT IN production and the mock header is provided
    if (process.env.NODE_ENV !== 'production') {
      const request = context.switchToHttp().getRequest();
      const mockRoleHeader = request.headers['x-mock-role'];

      if (mockRoleHeader) {
        // Attach a mock user
        request.user = {
          userId: 6767,
          assigned_role: mockRoleHeader as AssignedRole,
        };
        return true;
      }
    }

    // Otherwise, proceed with standard Passport JWT validation
    return super.canActivate(context);
  }
}
