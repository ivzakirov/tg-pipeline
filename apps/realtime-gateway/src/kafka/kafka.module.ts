import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KafkaConsumerService } from './kafka-consumer.service';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [GatewayModule],
  providers: [KafkaConsumerService],
})
export class KafkaModule {}
