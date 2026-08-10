import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    // If JWT Secret is not in env, throw error
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
    });
  }

  async validate(payload: { sub: string | number; email: string }) {
    const userId =
      typeof payload.sub === 'string' ? parseInt(payload.sub, 10) : payload.sub;

    if (isNaN(userId)) {
      return null;
    }

    const user = await this.prisma.staffUser.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        username: true,
        first_name: true,
        last_name: true,
        assigned_role: true,
        is_active: true,
      },
    });

    return user;
  }
}
