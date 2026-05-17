import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@tg-pipeline/kafka-schemas';
import type {
  ConfigSourcesChangedEvent,
  ConfigPipelinesChangedEvent,
  ConfigUsersTelegramChangedEvent,
} from '@tg-pipeline/kafka-schemas';

@Injectable()
export class KafkaService implements OnModuleInit {
  constructor(@Inject('KAFKA_CLIENT') private readonly client: ClientKafka) {}

  async onModuleInit() {
    await this.client.connect();
  }

  emit(topic: string, payload: unknown) {
    this.client.emit(topic, payload);
  }

  emitSourceChanged(event: ConfigSourcesChangedEvent) {
    this.emit(KAFKA_TOPICS.CONFIG_SOURCES_CHANGED, event);
  }

  emitPipelineChanged(event: ConfigPipelinesChangedEvent) {
    this.emit(KAFKA_TOPICS.CONFIG_PIPELINES_CHANGED, event);
  }

  emitTelegramChanged(event: ConfigUsersTelegramChangedEvent) {
    this.emit(KAFKA_TOPICS.CONFIG_USERS_TELEGRAM_CHANGED, event);
  }
}
