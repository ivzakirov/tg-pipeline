import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramSessionEntity } from './telegram-session.entity';
import { TelegramAuthService } from './telegram-auth.service';
import { TelegramAuthController } from './telegram-auth.controller';
import { TelegramCryptoService } from './telegram-crypto.service';
import { TelegramRedisService } from './telegram-redis.service';

@Module({
  imports: [TypeOrmModule.forFeature([TelegramSessionEntity])],
  providers: [TelegramAuthService, TelegramCryptoService, TelegramRedisService],
  controllers: [TelegramAuthController],
})
export class TelegramAuthModule {}
