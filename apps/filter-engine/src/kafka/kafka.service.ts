import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { KAFKA_TOPICS } from '@tg-pipeline/kafka-schemas';
import type {
  FilteredMessage,
  RawTelegramMessage,
  RawTelegramMessageDlt,
  ConfigPipelinesChangedEvent,
} from '@tg-pipeline/kafka-schemas';
import { PipelineIndexService } from '../filter/pipeline-index.service';
import { FilterProcessorService } from '../filter/filter-processor.service';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private readonly consumer: Consumer;

  constructor(
    @Inject('KAFKA_CLIENT') private readonly client: ClientKafka,
    config: ConfigService,
    private readonly index: PipelineIndexService,
    private readonly processor: FilterProcessorService,
  ) {
    const kafka = new Kafka({
      brokers: config.getOrThrow<string>('KAFKA_BROKERS').split(','),
      clientId: 'filter-engine-consumer',
    });
    this.consumer = kafka.consumer({ groupId: 'filter-engine-group' });
  }

  async onModuleInit() {
    await this.client.connect();
    await this.consumer.connect();
    await this.consumer.subscribe({
      topics: [KAFKA_TOPICS.TELEGRAM_RAW, KAFKA_TOPICS.CONFIG_PIPELINES_CHANGED],
      fromBeginning: false,
    });
    await this.consumer.run({ eachMessage: (p) => this.dispatch(p) });
  }

  publishFiltered(msg: FilteredMessage) {
    this.client.emit(KAFKA_TOPICS.PIPELINE_FILTERED, msg);
  }

  publishToDlt(original: RawTelegramMessage, error: string) {
    const dlt: RawTelegramMessageDlt = {
      originalMessage: original,
      error,
      failedAt: new Date().toISOString(),
    };
    this.client.emit(KAFKA_TOPICS.TELEGRAM_RAW_DLT, dlt);
  }

  private async dispatch({ topic, message }: EachMessagePayload) {
    if (!message.value) return;
    const payload = JSON.parse(message.value.toString());

    if (topic === KAFKA_TOPICS.TELEGRAM_RAW) {
      await this.processor.process(payload as RawTelegramMessage);
    } else if (topic === KAFKA_TOPICS.CONFIG_PIPELINES_CHANGED) {
      const e = payload as ConfigPipelinesChangedEvent;
      this.logger.log(`Pipeline ${e.action}: ${e.pipelineId}`);
      await this.index.reloadPipeline(e.pipelineId, e.action);
    }
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
  }
}
