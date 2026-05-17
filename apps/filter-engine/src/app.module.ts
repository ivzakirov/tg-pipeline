import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilterModule } from './filter/filter.module';
import { KafkaModule } from './kafka/kafka.module';
import { HealthModule } from './health/health.module';
import { PipelineEntity } from './database/pipeline.entity';
import { PipelineSourceEntity } from './database/pipeline-source.entity';
import { MessageEntity } from './database/message.entity';
import { SourceEntity } from './database/source.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow('DATABASE_URL'),
        entities: [PipelineEntity, PipelineSourceEntity, MessageEntity, SourceEntity],
        synchronize: false,
      }),
    }),
    FilterModule,
    KafkaModule,
    HealthModule,
  ],
})
export class AppModule {}
