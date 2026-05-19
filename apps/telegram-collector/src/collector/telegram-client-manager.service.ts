import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramClient, Api } from 'telegram';
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
  private readonly pollingIntervals = new Map<string, ReturnType<typeof setInterval>>();
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
      await client.start({
        phoneNumber: () => Promise.resolve(session.phone ?? ''),
        phoneCode: () => Promise.reject(new Error('session already authorised')),
        password: () => Promise.reject(new Error('session already authorised')),
        onError: (err) => this.logger.warn(`Auth check: ${err.message}`),
      });

      const me = await client.getMe();
      const dcId = (client as any).session?.dcId ?? 'unknown';
      this.logger.log(
        `Authenticated as: ${(me as any).username ?? (me as any).phone ?? (me as any).id}, DC: ${dcId}`,
      );

      const sources = await this.sourceRepo.find({ where: { ownerId: userId, enabled: true } });
      const allowedChannelIds = new Set(sources.map((s) => Number(s.telegramId)));

      // Populate entity cache; build channelId → entity map for polling
      const dialogs = await client.getDialogs({ limit: 200 });
      const entityMap = new Map<number, any>();
      for (const d of dialogs as any[]) {
        const peer = d.entity;
        if (!peer) continue;
        let id: number | null = null;
        if (peer.megagroup || peer.broadcast) id = -(1000000000000 + Number(peer.id));
        else if (peer.id) id = -Number(peer.id);
        if (id !== null && allowedChannelIds.has(id)) entityMap.set(id, peer);
      }
      this.logger.log(`Entity cache: ${entityMap.size}/${allowedChannelIds.size} channels resolved`);

      // Explicitly sync update pts so Telegram starts pushing updates
      try {
        const state = await client.invoke(new Api.updates.GetState());
        this.logger.log(`Update state synced: pts=${state.pts}, seq=${state.seq}, date=${state.date}`);
      } catch (e: any) {
        this.logger.warn(`Could not sync update state: ${e.message}`);
      }

      // Event-based path (will fire if Telegram pushes updates)
      client.addEventHandler(
        (event: NewMessageEvent) => this.handleEventMessage(userId, event, allowedChannelIds),
        new NewMessage({}),
      );

      // Polling fallback: every 15 s fetch new messages directly
      const lastSeenIds = new Map<number, number>();
      for (const [channelId, entity] of entityMap) {
        try {
          const msgs: any[] = await client.getMessages(entity, { limit: 1 });
          lastSeenIds.set(channelId, msgs[0]?.id ?? 0);
          this.logger.log(`Channel ${channelId}: latest msgId=${msgs[0]?.id ?? 0}`);
        } catch (e: any) {
          this.logger.warn(`Cannot init poll cursor for ${channelId}: ${e.message}`);
        }
      }

      const interval = setInterval(() => this.poll(userId, client, entityMap, lastSeenIds), 15_000);
      this.pollingIntervals.set(userId, interval);

      this.clients.set(userId, client);
      this.logger.log(`Client started for user ${userId}, watching ${sources.length} channels`);
    } catch (err) {
      this.logger.error(`Failed to start client for user ${userId}`, err);
    }
  }

  private async poll(
    userId: string,
    client: TelegramClient,
    entityMap: Map<number, any>,
    lastSeenIds: Map<number, number>,
  ): Promise<void> {
    for (const [channelId, entity] of entityMap) {
      try {
        const minId = lastSeenIds.get(channelId) ?? 0;
        const msgs: any[] = await client.getMessages(entity, { limit: 50, minId });
        if (msgs.length === 0) continue;

        this.logger.log(`Poll: ${msgs.length} new msg(s) in channel ${channelId}`);
        for (const msg of [...msgs].reverse()) {
          await this.publishMessage(userId, msg, channelId);
          const cur = lastSeenIds.get(channelId) ?? 0;
          if (msg.id > cur) lastSeenIds.set(channelId, msg.id);
        }
      } catch (e: any) {
        this.logger.warn(`Poll error for channel ${channelId}: ${e.message}`);
      }
    }
  }

  async stopClient(userId: string): Promise<void> {
    const interval = this.pollingIntervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(userId);
    }
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

  // Called by event handler (push path)
  private async handleEventMessage(
    userId: string,
    event: NewMessageEvent,
    allowedChannelIds: Set<number>,
  ): Promise<void> {
    const msg = event.message;
    if (!msg.peerId) return;

    const rawPeerId = (msg.peerId as any).channelId ?? (msg.peerId as any).chatId;
    if (!rawPeerId) return;

    const isChannel = (msg.peerId as any).channelId !== undefined;
    const channelId = isChannel
      ? -(1000000000000 + Number(rawPeerId))
      : -Number(rawPeerId);

    if (!allowedChannelIds.has(channelId)) return;

    this.logger.log(`Event: new message in channel ${channelId}`);
    await this.publishMessage(userId, msg, channelId);
  }

  // Shared publish logic (used by both event and poll paths)
  private async publishMessage(userId: string, msg: any, channelId: number): Promise<void> {
    let senderName = 'unknown';
    try {
      const sender = await msg.getSender?.();
      senderName =
        (sender as any)?.firstName ??
        (sender as any)?.title ??
        String((sender as any)?.id ?? 'unknown');
    } catch {
      // sender not critical
    }

    const withFloodRetry = async (attempt = 0): Promise<void> => {
      try {
        this.kafka.publishRawMessage({
          userId,
          messageId: msg.id,
          channelId,
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
