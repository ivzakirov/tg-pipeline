import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectorModule } from './collector/collector.module';
import { KafkaModule } from './kafka/kafka.module';
import { HealthModule } from './health/health.module';
import { TelegramSessionEntity } from './database/telegram-session.entity';
import { SourceEntity } from './database/source.entity';
import { AvatarCacheEntity } from './database/avatar-cache.entity';
import { MediaCacheEntity } from './database/media-cache.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow('DATABASE_URL'),
        entities: [TelegramSessionEntity, SourceEntity, AvatarCacheEntity, MediaCacheEntity],
        synchronize: false,
      }),
    }),
    KafkaModule,
    CollectorModule,
    HealthModule,
  ],
})
export class AppModule {}
