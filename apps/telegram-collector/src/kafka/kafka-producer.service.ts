import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@tg-pipeline/kafka-schemas';
import type { RawTelegramMessage } from '@tg-pipeline/kafka-schemas';

@Injectable()
export class KafkaProducerService implements OnModuleInit {
  constructor(@Inject('KAFKA_CLIENT') private readonly client: ClientKafka) {}

  async onModuleInit() {
    await this.client.connect();
  }

  publishRawMessage(message: RawTelegramMessage) {
    this.client.emit(KAFKA_TOPICS.TELEGRAM_RAW, message);
  }
}
