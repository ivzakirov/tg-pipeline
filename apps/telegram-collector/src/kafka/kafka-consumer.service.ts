import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { KAFKA_TOPICS } from '@tg-pipeline/kafka-schemas';
import type {
  ConfigSourcesChangedEvent,
  ConfigUsersTelegramChangedEvent,
} from '@tg-pipeline/kafka-schemas';

type MessageHandler = (event: ConfigSourcesChangedEvent | ConfigUsersTelegramChangedEvent) => void;

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly consumer: Consumer;
  private readonly handlers = new Map<string, MessageHandler[]>();

  constructor(config: ConfigService) {
    const kafka = new Kafka({
      brokers: config.getOrThrow<string>('KAFKA_BROKERS').split(','),
      clientId: 'telegram-collector-consumer',
    });
    this.consumer = kafka.consumer({ groupId: 'telegram-collector-group' });
  }

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({
      topics: [KAFKA_TOPICS.CONFIG_SOURCES_CHANGED, KAFKA_TOPICS.CONFIG_USERS_TELEGRAM_CHANGED],
      fromBeginning: false,
    });
    await this.consumer.run({ eachMessage: (payload) => this.dispatch(payload) });
  }

  on(topic: string, handler: MessageHandler) {
    const existing = this.handlers.get(topic) ?? [];
    this.handlers.set(topic, [...existing, handler]);
  }

  private async dispatch({ topic, message }: EachMessagePayload) {
    if (!message.value) return;
    const payload = JSON.parse(message.value.toString());
    (this.handlers.get(topic) ?? []).forEach((h) => h(payload));
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
  }
}
