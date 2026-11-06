import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignInDto, RefreshTokenDto } from './dto';
import { AuthTokensResponseDto } from './dto/responses/auth-tokens-response.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('signin')
  @ApiOperation({ summary: 'Staff User Sign In' })
  @ApiOkResponse({ type: AuthTokensResponseDto })
  signin(@Body() userDto: SignInDto): Promise<AuthTokensResponseDto> {
    return this.authService.signin(userDto);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh Access Token' })
  @ApiOkResponse({ type: AuthTokensResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: any,
  ): Promise<AuthTokensResponseDto> {
    const { userId, refreshToken, tokenId } = req.user;
    return this.authService.refreshTokens(userId, refreshToken, tokenId);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({ summary: 'Logout Staff User' })
  logout(@CurrentUser('id') userId: number, @Req() req: any) {
    const tokenId = req.user?.tokenId || '';
    return this.authService.logout(userId, tokenId);
  }
}
