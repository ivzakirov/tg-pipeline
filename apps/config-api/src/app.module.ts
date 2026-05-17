import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SourcesModule } from './sources/sources.module';
import { PipelinesModule } from './pipelines/pipelines.module';
import { MessagesModule } from './messages/messages.module';
import { TelegramAuthModule } from './telegram-auth/telegram-auth.module';
import { KafkaModule } from './kafka/kafka.module';
import { HealthModule } from './health/health.module';
import { UserEntity } from './users/user.entity';
import { SourceEntity } from './sources/source.entity';
import { PipelineEntity } from './pipelines/pipeline.entity';
import { PipelineSourceEntity } from './pipelines/pipeline-source.entity';
import { MessageEntity } from './messages/message.entity';
import { TelegramSessionEntity } from './telegram-auth/telegram-session.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow('DATABASE_URL'),
        entities: [
          UserEntity,
          SourceEntity,
          PipelineEntity,
          PipelineSourceEntity,
          MessageEntity,
          TelegramSessionEntity,
        ],
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: true,
        synchronize: false,
      }),
    }),
    KafkaModule,
    AuthModule,
    UsersModule,
    SourcesModule,
    PipelinesModule,
    MessagesModule,
    TelegramAuthModule,
    HealthModule,
  ],
})
export class AppModule {}
