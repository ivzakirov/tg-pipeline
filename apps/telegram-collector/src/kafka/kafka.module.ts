import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaProducerService } from './kafka-producer.service';
import { KafkaConsumerService } from './kafka-consumer.service';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_CLIENT',
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              brokers: config.getOrThrow<string>('KAFKA_BROKERS').split(','),
              clientId: 'telegram-collector',
            },
            producer: { allowAutoTopicCreation: true },
          },
        }),
      },
    ]),
  ],
  providers: [KafkaProducerService, KafkaConsumerService],
  exports: [KafkaProducerService, KafkaConsumerService],
})
export class KafkaModule {}
