import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage, NewMessageEvent } from 'telegram/events';
import { ConfigService } from '@nestjs/config';
import { TelegramSessionEntity } from '../database/telegram-session.entity';
import { SourceEntity } from '../database/source.entity';
import { TelegramCryptoService } from './telegram-crypto.service';
import { KafkaProducerService } from '../kafka/kafka-producer.service';

@Injectable()
export class TelegramClientManager implements OnModuleDestroy {
  private readonly logger = new Logger(TelegramClientManager.name);
  private readonly clients = new Map<string, TelegramClient>();
  private readonly apiId: number;
  private readonly apiHash: string;

  constructor(
    private readonly config: ConfigService,
    private readonly crypto: TelegramCryptoService,
    private readonly kafka: KafkaProducerService,
    @InjectRepository(TelegramSessionEntity)
    private readonly sessionRepo: Repository<TelegramSessionEntity>,
    @InjectRepository(SourceEntity)
    private readonly sourceRepo: Repository<SourceEntity>,
  ) {
    this.apiId = parseInt(config.getOrThrow('TELEGRAM_API_ID'), 10);
    this.apiHash = config.getOrThrow('TELEGRAM_API_HASH');
  }

  async loadAll(): Promise<void> {
    const sessions = await this.sessionRepo.find();
    await Promise.all(sessions.map((s) => this.startClient(s.userId)));
  }

  async startClient(userId: string): Promise<void> {
    if (this.clients.has(userId)) return;

    const session = await this.sessionRepo.findOne({ where: { userId } });
    if (!session) return;

    const sessionString = this.crypto.decrypt(session.sessionStringEncrypted);
    const client = new TelegramClient(new StringSession(sessionString), this.apiId, this.apiHash, {
      connectionRetries: 5,
    });

    try {
      await client.connect();
      const sources = await this.sourceRepo.find({ where: { ownerId: userId, enabled: true } });
      const channelIds = sources.map((s) => Number(s.telegramId));

      client.addEventHandler(
        (event: NewMessageEvent) => this.handleMessage(userId, event),
        new NewMessage({ chats: channelIds }),
      );

      this.clients.set(userId, client);
      this.logger.log(`Client started for user ${userId}, watching ${channelIds.length} channels`);
    } catch (err) {
      this.logger.error(`Failed to start client for user ${userId}`, err);
    }
  }

  async stopClient(userId: string): Promise<void> {
    const client = this.clients.get(userId);
    if (!client) return;
    await client.disconnect();
    this.clients.delete(userId);
    this.logger.log(`Client stopped for user ${userId}`);
  }

  async refreshClientSources(userId: string): Promise<void> {
    await this.stopClient(userId);
    await this.startClient(userId);
  }

  getActiveCount(): number {
    return this.clients.size;
  }

  private async handleMessage(userId: string, event: NewMessageEvent) {
    const msg = event.message;
    if (!msg.peerId) return;

    const peerId = (msg.peerId as any).channelId ?? (msg.peerId as any).chatId;
    if (!peerId) return;

    const sender = await msg.getSender();
    const senderName =
      (sender as any)?.firstName ??
      (sender as any)?.title ??
      String((sender as any)?.id ?? 'unknown');

    const withFloodRetry = async (attempt = 0): Promise<void> => {
      try {
        this.kafka.publishRawMessage({
          userId,
          messageId: msg.id,
          channelId: Number(peerId),
          senderId: Number((msg.fromId as any)?.userId ?? 0),
          senderName,
          text: msg.text ?? '',
          mediaType: msg.media ? (msg.media as any).className : undefined,
          timestamp: new Date(msg.date * 1000).toISOString(),
        });
      } catch (err: any) {
        if (err?.errorMessage === 'FLOOD_WAIT' && attempt < 5) {
          const waitMs = (err.seconds ?? 30) * 1000;
          this.logger.warn(`FloodWait for user ${userId}, retrying in ${waitMs}ms`);
          await new Promise((r) => setTimeout(r, waitMs));
          await withFloodRetry(attempt + 1);
        } else {
          this.logger.error(`Failed to publish message for user ${userId}`, err);
        }
      }
    };

    await withFloodRetry();
  }

  async onModuleDestroy() {
    await Promise.all([...this.clients.keys()].map((id) => this.stopClient(id)));
  }
}
