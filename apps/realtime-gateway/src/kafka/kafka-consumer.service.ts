import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { KAFKA_TOPICS } from '@tg-pipeline/kafka-schemas';
import type { FilteredMessage } from '@tg-pipeline/kafka-schemas';
import { MessagesGateway } from '../gateway/messages.gateway';

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private readonly consumer: Consumer;

  constructor(
    config: ConfigService,
    private readonly gateway: MessagesGateway,
  ) {
    const kafka = new Kafka({
      brokers: config.getOrThrow<string>('KAFKA_BROKERS').split(','),
      clientId: 'realtime-gateway-consumer',
      retry: { retries: 10, initialRetryTime: 500, maxRetryTime: 15000 },
    });
    this.consumer = kafka.consumer({ groupId: 'realtime-gateway-group' });
  }

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({
      topics: [KAFKA_TOPICS.PIPELINE_FILTERED],
      fromBeginning: false,
    });

    this.consumer.on(this.consumer.events.CRASH, ({ payload }) => {
      this.logger.error('Kafka consumer crashed, restarting...', payload.error?.message);
      setTimeout(() => this.restartConsumer(), 3000);
    });

    await this.consumer.run({ eachMessage: (p) => this.dispatch(p) });
    this.logger.log('Kafka consumer started');
  }

  private async restartConsumer() {
    try {
      await this.consumer.disconnect();
      await this.consumer.connect();
      await this.consumer.run({ eachMessage: (p) => this.dispatch(p) });
    } catch (err) {
      this.logger.error('Consumer restart failed', err);
      setTimeout(() => this.restartConsumer(), 5000);
    }
  }

  private async dispatch({ message }: EachMessagePayload) {
    if (!message.value) return;
    const msg = JSON.parse(message.value.toString()) as FilteredMessage;
    this.gateway.broadcast(msg);
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
  }
}
