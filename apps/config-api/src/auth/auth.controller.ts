import { Body, Controller, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';

class RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}

class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

@ApiTags('auth')
@Controller('auth')
@Throttle({ default: { ttl: 60_000, limit: 10 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.register(dto.email, dto.password);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken, userId: tokens.userId, email: tokens.email };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.login(dto.email, dto.password);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken, userId: tokens.userId, email: tokens.email };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Browser may send duplicate refresh_token cookies (accumulated from different paths/sessions).
    // cookie-parser only exposes the first one; we parse the raw header and try each candidate.
    const candidates = (req.headers.cookie ?? '')
      .split(';')
      .map(c => c.trim())
      .filter(c => c.startsWith('refresh_token='))
      .map(c => c.slice('refresh_token='.length));

    if (!candidates.length) throw new UnauthorizedException('No refresh token');

    let lastError: unknown;
    for (const token of candidates) {
      try {
        const tokens = await this.authService.refresh(token);
        this.setRefreshCookie(res, tokens.refreshToken);
        return { accessToken: tokens.accessToken, userId: tokens.userId, email: tokens.email };
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError;
  }

  private setRefreshCookie(res: Response, token: string) {
    // Clear stale cookies at previously used paths to prevent duplicate-cookie accumulation
    res.clearCookie('refresh_token', { path: '/api/auth' });
    res.clearCookie('refresh_token', { path: '/auth' });
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
}
