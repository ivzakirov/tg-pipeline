import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesGateway } from './messages.gateway';
import { PipelineEntity } from '../database/pipeline.entity';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow('JWT_ACCESS_SECRET'),
      }),
    }),
    TypeOrmModule.forFeature([PipelineEntity]),
  ],
  providers: [MessagesGateway],
  exports: [MessagesGateway],
})
export class GatewayModule {}
