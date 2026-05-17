import { Body, Controller, Delete, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TelegramAuthService } from './telegram-auth.service';

class SendCodeDto {
  @IsString() phone: string;
}

class VerifyCodeDto {
  @IsString() phone: string;
  @IsString() code: string;
  @IsString() phoneCodeHash: string;
}

class Verify2faDto {
  @IsString() password: string;
}

@ApiTags('telegram-auth')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('telegram-auth')
export class TelegramAuthController {
  constructor(private readonly telegramAuthService: TelegramAuthService) {}

  @Get('status')
  status(@Req() req: Request) {
    return this.telegramAuthService.getStatus((req.user as any).id);
  }

  @Post('send-code')
  sendCode(@Body() dto: SendCodeDto, @Req() req: Request) {
    return this.telegramAuthService.sendCode((req.user as any).id, dto.phone);
  }

  @Post('verify-code')
  verifyCode(@Body() dto: VerifyCodeDto, @Req() req: Request) {
    return this.telegramAuthService.verifyCode(
      (req.user as any).id,
      dto.phone,
      dto.code,
      dto.phoneCodeHash,
    );
  }

  @Post('verify-2fa')
  verify2fa(@Body() dto: Verify2faDto, @Req() req: Request) {
    return this.telegramAuthService.verify2fa((req.user as any).id, dto.password);
  }

  @Delete()
  disconnect(@Req() req: Request) {
    return this.telegramAuthService.disconnect((req.user as any).id);
  }
}
