import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramSessionEntity } from '../database/telegram-session.entity';
import { SourceEntity } from '../database/source.entity';
import { CollectorService } from './collector.service';
import { TelegramCryptoService } from './telegram-crypto.service';
import { TelegramClientManager } from './telegram-client-manager.service';

@Module({
  imports: [TypeOrmModule.forFeature([TelegramSessionEntity, SourceEntity])],
  providers: [TelegramCryptoService, TelegramClientManager, CollectorService],
  exports: [TelegramClientManager],
})
export class CollectorModule {}
