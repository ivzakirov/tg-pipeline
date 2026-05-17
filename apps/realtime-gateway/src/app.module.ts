import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GatewayModule } from './gateway/gateway.module';
import { KafkaModule } from './kafka/kafka.module';
import { HealthModule } from './health/health.module';
import { PipelineEntity } from './database/pipeline.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow('DATABASE_URL'),
        entities: [PipelineEntity],
        synchronize: false,
      }),
    }),
    GatewayModule,
    KafkaModule,
    HealthModule,
  ],
})
export class AppModule {}
