import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { evaluate } from './filter-evaluator';
import { PipelineIndexService } from './pipeline-index.service';
import { MessageEntity } from '../database/message.entity';
import type { FilteredMessage, RawTelegramMessage } from '@tg-pipeline/kafka-schemas';

@Injectable()
export class FilterProcessorService {
  private readonly logger = new Logger(FilterProcessorService.name);

  constructor(
    private readonly index: PipelineIndexService,
    @InjectRepository(MessageEntity)
    private readonly messageRepo: Repository<MessageEntity>,
  ) {}

  async process(
    raw: RawTelegramMessage,
    onFiltered: (msg: FilteredMessage) => void,
    onDlt: (msg: RawTelegramMessage, error: string) => void,
  ): Promise<void> {
    const pipelines = this.index.getPipelinesForMessage(raw.userId, raw.channelId);

    await Promise.all(
      pipelines.map(async (pipeline) => {
        try {
          const passes = pipeline.filterConfig ? evaluate(pipeline.filterConfig, raw) : true;
          if (!passes) return;

          let replyToText: string | null = null;
          let replyToSenderName: string | null = null;
          if (raw.replyToMsgId) {
            const replyMsg = await this.messageRepo.findOne({
              where: { telegramMessageId: raw.replyToMsgId as any, channelId: raw.channelId as any },
            });
            replyToText = replyMsg?.text ? replyMsg.text.slice(0, 150) : null;
            replyToSenderName = replyMsg?.senderName ?? null;
          }

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
              mediaMimeType: raw.mediaMimeType ?? null,
              replyToMsgId: raw.replyToMsgId ?? null,
              replyToText,
              replyToSenderName,
            }),
          );

          onFiltered({
            ...raw,
            pipelineId: pipeline.id,
            pipelineName: pipeline.name,
            replyToText: replyToText ?? undefined,
            replyToSenderName: replyToSenderName ?? undefined,
          });
        } catch (err) {
          this.logger.error(`Error processing pipeline ${pipeline.id}`, err);
          onDlt(raw, err instanceof Error ? err.message : String(err));
        }
      }),
    );
  }
}
