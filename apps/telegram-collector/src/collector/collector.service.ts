import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { KAFKA_TOPICS } from '@tg-pipeline/kafka-schemas';
import type {
  ConfigSourcesChangedEvent,
  ConfigUsersTelegramChangedEvent,
} from '@tg-pipeline/kafka-schemas';
import { TelegramClientManager } from './telegram-client-manager.service';
import { KafkaConsumerService } from '../kafka/kafka-consumer.service';

@Injectable()
export class CollectorService implements OnModuleInit {
  private readonly logger = new Logger(CollectorService.name);

  constructor(
    private readonly manager: TelegramClientManager,
    private readonly consumer: KafkaConsumerService,
  ) {}

  async onModuleInit() {
    await this.manager.loadAll();

    this.consumer.on(KAFKA_TOPICS.CONFIG_SOURCES_CHANGED, (event) => {
      const e = event as ConfigSourcesChangedEvent;
      this.logger.log(`Source changed for user ${e.userId}, refreshing client`);
      this.manager.refreshClientSources(e.userId);
    });

    this.consumer.on(KAFKA_TOPICS.CONFIG_USERS_TELEGRAM_CHANGED, (event) => {
      const e = event as ConfigUsersTelegramChangedEvent;
      if (e.action === 'connected') {
        this.logger.log(`Telegram connected for user ${e.userId}, starting client`);
        this.manager.startClient(e.userId);
      } else {
        this.logger.log(`Telegram disconnected for user ${e.userId}, stopping client`);
        this.manager.stopClient(e.userId);
      }
    });
  }
}
