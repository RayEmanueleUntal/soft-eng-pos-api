import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Signin
  @HttpCode(HttpStatus.OK)
  @Post('signin')
  signin(@Body() userDto: SignInDto) {
    return this.authService.signin(userDto);
  }
}
