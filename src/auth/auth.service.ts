import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthTokensResponseDto, SignInDto } from './dto';
import * as argon from 'argon2';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as CacheManager from 'cache-manager';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: CacheManager.Cache,
  ) {}

  // Signin
  async signin(userDto: SignInDto): Promise<AuthTokensResponseDto> {
    this.logger.log(`Attempting signin for username: ${userDto.username}`);

    const user = await this.prisma.staffUser.findUnique({
      where: {
        username: userDto.username,
      },
    });

    if (!user || !user.is_active) {
      this.logger.warn(
        `Signin failed: Invalid credentials or inactive user (${userDto.username})`,
      );
      throw new ForbiddenException('Credentials incorrect');
    }

    const pwMatches = await argon.verify(user.password_hash, userDto.password);

    if (!pwMatches) {
      this.logger.warn(
        `Signin failed: Password mismatch for user ID: ${user.id}`,
      );
      throw new ForbiddenException('Credentials incorrect');
    }

    return this.generateTokens(user.id, user.username, user.assigned_role);
  }

  async refreshTokens(
    userId: number,
    refreshToken: string,
    tokenId: string,
  ): Promise<AuthTokensResponseDto> {
    this.logger.log(`Refreshing tokens for User ID: ${userId}`);

    const user = await this.prisma.staffUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        assigned_role: true,
        is_active: true,
      },
    });

    if (!user || !user.is_active) {
      this.logger.warn(
        `Refresh rejected: User ID ${userId} is inactive or does not exist.`,
      );
      throw new UnauthorizedException('Access Denied');
    }

    const tokenHash = this.hashToken(refreshToken);
    const redisKey = `refresh_token:${userId}:${tokenId}`;

    const storedHash = await this.cacheManager.get<string>(redisKey);

    if (!storedHash || storedHash !== tokenHash) {
      this.logger.warn(
        `Security alert: Invalid or revoked refresh token for User ID: ${userId}`,
      );
      await this.cacheManager.del(redisKey);
      throw new UnauthorizedException('Access Denied: Invalid Refresh Token');
    }

    // Invalidate old token (Rotation)
    await this.cacheManager.del(redisKey);

    // Issue new token pair
    return this.generateTokens(userId, user.username, user.assigned_role);
  }

  async logout(userId: number, tokenId: string): Promise<{ success: boolean }> {
    this.logger.log(`Logging out User ID: ${userId}`);
    const redisKey = `refresh_token:${userId}:${tokenId}`;
    await this.cacheManager.del(redisKey);
    return { success: true };
  }

  private async generateTokens(
    userId: number,
    username: string,
    role: string,
  ): Promise<AuthTokensResponseDto> {
    const tokenId = crypto.randomUUID();

    const accessPayload = { sub: userId, username, role };
    const refreshPayload = { sub: userId, username, role, tokenId };

    const accessSecret = this.config.get<string>('JWT_SECRET');
    const refreshSecret =
      this.config.get<string>('JWT_REFRESH_SECRET') || accessSecret;

    const accessTokenTtl = (this.config.get<string>('JWT_ACCESS_EXPIRATION') ||
      '15m') as any;

    const refreshTtl = (this.config.get<string>('JWT_REFRESH_EXPIRATION') ||
      '7d') as any;

    const TTL_MS = 7 * 24 * 60 * 60 * 1000;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        expiresIn: accessTokenTtl,
        secret: accessSecret,
      }),
      this.jwt.signAsync(refreshPayload, {
        expiresIn: refreshTtl,
        secret: refreshSecret,
      }),
    ]);

    const tokenHash = this.hashToken(refreshToken);
    const redisKey = `refresh_token:${userId}:${tokenId}`;

    await this.cacheManager.set(redisKey, tokenHash, TTL_MS);

    return AuthTokensResponseDto.fromTokens(accessToken, refreshToken);
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
