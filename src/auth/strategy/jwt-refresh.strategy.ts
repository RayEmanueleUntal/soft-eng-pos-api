import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: ConfigService) {
    const secret =
      config.get<string>('JWT_REFRESH_SECRET') ||
      config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          if (request && request.body && request.body.refreshToken) {
            return request.body.refreshToken;
          } else if (request && request.headers.authorization) {
            return request.headers.authorization.replace('Bearer ', '').trim();
          }
          return null;
        },
      ]),
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const refreshToken =
      req.body?.refreshToken ||
      req.headers.authorization?.replace('Bearer ', '').trim();

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    const userId =
      typeof payload.sub === 'string' ? parseInt(payload.sub, 10) : payload.sub;

    if (isNaN(userId)) {
      throw new UnauthorizedException('Invalid user ID in token payload');
    }

    return {
      userId,
      username: payload.username,
      role: payload.role,
      tokenId: payload.tokenId,
      refreshToken,
    };
  }
}
