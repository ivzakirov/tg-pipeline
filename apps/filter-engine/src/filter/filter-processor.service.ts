import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { evaluate } from './filter-evaluator';
import { PipelineIndexService } from './pipeline-index.service';
import { MessageEntity } from '../database/message.entity';
import { KafkaService } from '../kafka/kafka.service';
import type { RawTelegramMessage } from '@tg-pipeline/kafka-schemas';

@Injectable()
export class FilterProcessorService {
  private readonly logger = new Logger(FilterProcessorService.name);

  constructor(
    private readonly index: PipelineIndexService,
    private readonly kafka: KafkaService,
    @InjectRepository(MessageEntity)
    private readonly messageRepo: Repository<MessageEntity>,
  ) {}

  async process(raw: RawTelegramMessage): Promise<void> {
    const pipelines = this.index.getPipelinesForMessage(raw.userId, raw.channelId);

    await Promise.all(
      pipelines.map(async (pipeline) => {
        try {
          const passes = pipeline.filterConfig ? evaluate(pipeline.filterConfig, raw) : true;
          if (!passes) return;

          await this.messageRepo.save(
            this.messageRepo.create({
              pipelineId: pipeline.id,
              telegramMessageId: raw.messageId,
              channelId: raw.channelId,
              senderId: raw.senderId,
              senderName: raw.senderName,
              text: raw.text,
              mediaType: raw.mediaType,
              mediaUrl: raw.mediaUrl,
            }),
          );

          this.kafka.publishFiltered({
            ...raw,
            pipelineId: pipeline.id,
            pipelineName: pipeline.name,
          });
        } catch (err) {
          this.logger.error(`Error processing pipeline ${pipeline.id}`, err);
          this.kafka.publishToDlt(raw, err instanceof Error ? err.message : String(err));
        }
      }),
    );
  }
}
