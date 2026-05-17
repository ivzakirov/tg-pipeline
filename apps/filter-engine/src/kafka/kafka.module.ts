import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaService } from './kafka.service';
import { FilterModule } from '../filter/filter.module';

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
              clientId: 'filter-engine',
            },
            producer: { allowAutoTopicCreation: true },
          },
        }),
      },
    ]),
    FilterModule,
  ],
  providers: [KafkaService],
  exports: [KafkaService],
})
export class KafkaModule {}
