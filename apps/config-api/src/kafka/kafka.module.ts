import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaService } from './kafka.service';

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
              clientId: 'config-api',
            },
            producer: { allowAutoTopicCreation: true },
          },
        }),
      },
    ]),
  ],
  providers: [KafkaService],
  exports: [KafkaService],
})
export class KafkaModule {}
