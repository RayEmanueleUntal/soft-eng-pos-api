import { ApiProperty } from '@nestjs/swagger';

export class AuthTokensResponseDto {
  @ApiProperty({
    description: 'Short-lived JWT Access Token (expires in 15 minutes)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token!: string;

  @ApiProperty({
    description: 'Long-lived JWT Refresh Token (expires in 7 days)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refresh_token!: string;

  static fromTokens(
    accessToken: string,
    refreshToken: string,
  ): AuthTokensResponseDto {
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
}
