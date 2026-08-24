import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { SignInDto } from './dto';
import * as argon from 'argon2';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  // Signin
  async signin(userDto: SignInDto) {
    const user = await this.prisma.staffUser.findUnique({
      where: {
        username: userDto.username,
      },
    });

    if (!user) {
      throw new ForbiddenException('Credentials incorrect');
    }

    const pwMatches = await argon.verify(user.password_hash, userDto.password);

    if (!pwMatches) {
      throw new ForbiddenException('Credentials incorrect');
    }

    return this.signToken(user.id, user.username);
  }

  // Sign Token
  private async signToken(
    userId: number,
    username: string,
  ): Promise<{ access_token: string }> {
    const payload = {
      sub: userId,
      username,
    };
    const secret = this.config.get('JWT_SECRET');
    const token = await this.jwt.signAsync(payload, {
      expiresIn: '15m', // _CHANGE_ : Make it 4h or more
      secret: secret,
    });

    return {
      access_token: token,
    };
  }
}
