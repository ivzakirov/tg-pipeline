import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage, NewMessageEvent } from 'telegram/events';
import { ConfigService } from '@nestjs/config';
import { TelegramSessionEntity } from '../database/telegram-session.entity';
import { SourceEntity } from '../database/source.entity';
import { AvatarCacheEntity } from '../database/avatar-cache.entity';
import { MediaCacheEntity } from '../database/media-cache.entity';
import { TelegramCryptoService } from './telegram-crypto.service';
import { KafkaProducerService } from '../kafka/kafka-producer.service';

@Injectable()
export class TelegramClientManager implements OnModuleDestroy {
  private readonly logger = new Logger(TelegramClientManager.name);
  private readonly clients = new Map<string, TelegramClient>();
  private readonly pollingIntervals = new Map<string, ReturnType<typeof setInterval>>();
  private readonly watchdogIntervals = new Map<string, ReturnType<typeof setInterval>>();
  private readonly avatarFetchInProgress = new Set<string>();
  private readonly pendingAlbums = new Map<string, { bestMsg: any; channelId: number; timer: ReturnType<typeof setTimeout> }>();
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
    @InjectRepository(AvatarCacheEntity)
    private readonly avatarRepo: Repository<AvatarCacheEntity>,
    @InjectRepository(MediaCacheEntity)
    private readonly mediaRepo: Repository<MediaCacheEntity>,
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

      // Download avatars for tracked channels in the background (non-blocking)
      this.refreshAvatars(client, entityMap).catch((e) =>
        this.logger.warn(`Avatar refresh error: ${e.message}`),
      );

      // Explicitly sync update pts so Telegram starts pushing updates
      try {
        const state = await client.invoke(new Api.updates.GetState());
        this.logger.log(`Update state synced: pts=${state.pts}, seq=${state.seq}, date=${state.date}`);
      } catch (e: any) {
        this.logger.warn(`Could not sync update state: ${e.message}`);
      }

      // Event-based path (will fire if Telegram pushes updates)
      client.addEventHandler(
        (event: NewMessageEvent) => this.handleEventMessage(userId, event, allowedChannelIds, client),
        new NewMessage({}),
      );

      // Build channelId → sourceId map for cursor persistence
      const sourceIdMap = new Map<number, string>();
      for (const src of sources) sourceIdMap.set(Number(src.telegramId), src.id);

      // Init cursors from DB; catch up messages missed during downtime
      const lastSeenIds = new Map<number, number>();
      for (const src of sources) {
        const channelId = Number(src.telegramId);
        const savedId = Number(src.lastTelegramMsgId ?? 0);
        if (savedId > 0) {
          lastSeenIds.set(channelId, savedId);
        } else {
          // First run: anchor to current latest to avoid replaying entire history
          const entity = entityMap.get(channelId);
          if (entity) {
            try {
              const msgs: any[] = await client.getMessages(entity, { limit: 1 });
              const latestId = msgs[0]?.id ?? 0;
              lastSeenIds.set(channelId, latestId);
              await this.sourceRepo.update(src.id, { lastTelegramMsgId: latestId });
            } catch (e: any) {
              this.logger.warn(`Cannot init cursor for ${channelId}: ${e.message}`);
            }
          }
        }
      }

      // Catch up: publish messages that arrived during downtime
      for (const [channelId, entity] of entityMap) {
        const minId = lastSeenIds.get(channelId) ?? 0;
        if (minId === 0) continue;
        try {
          const missed: any[] = await client.getMessages(entity, { limit: 200, minId });
          if (missed.length > 0) {
            this.logger.log(`Catch-up: ${missed.length} missed message(s) in channel ${channelId}`);
            for (const msg of [...missed].reverse()) {
              await this.publishMessage(userId, msg, channelId, client);
              const cur = lastSeenIds.get(channelId) ?? 0;
              if (msg.id > cur) lastSeenIds.set(channelId, msg.id);
            }
            const srcId = sourceIdMap.get(channelId);
            if (srcId) await this.sourceRepo.update(srcId, { lastTelegramMsgId: lastSeenIds.get(channelId)! });
          }
        } catch (e: any) {
          this.logger.warn(`Catch-up error for channel ${channelId}: ${e.message}`);
        }
      }

      const interval = setInterval(() => this.poll(userId, client, entityMap, lastSeenIds, sourceIdMap), 15_000);
      this.pollingIntervals.set(userId, interval);

      this.clients.set(userId, client);
      this.logger.log(`Client started for user ${userId}, watching ${sources.length} channels`);

      const watchdog = setInterval(async () => {
        const c = this.clients.get(userId);
        if (!c) { clearInterval(watchdog); return; }
        try {
          await c.invoke(new Api.updates.GetState());
        } catch (e: any) {
          this.logger.warn(`Connection lost for user ${userId}: ${e.message} — reconnecting`);
          clearInterval(watchdog);
          this.watchdogIntervals.delete(userId);
          this.refreshClientSources(userId).catch((err) =>
            this.logger.error(`Reconnect failed for ${userId}: ${err.message}`)
          );
        }
      }, 90_000);
      this.watchdogIntervals.set(userId, watchdog);
    } catch (err) {
      this.logger.error(`Failed to start client for user ${userId}`, err);
    }
  }

  private async poll(
    userId: string,
    client: TelegramClient,
    entityMap: Map<number, any>,
    lastSeenIds: Map<number, number>,
    sourceIdMap: Map<number, string>,
  ): Promise<void> {
    for (const [channelId, entity] of entityMap) {
      try {
        const minId = lastSeenIds.get(channelId) ?? 0;
        const msgs: any[] = await client.getMessages(entity, { limit: 50, minId });
        if (msgs.length === 0) continue;

        this.logger.log(`Poll: ${msgs.length} new msg(s) in channel ${channelId}`);
        for (const msg of [...msgs].reverse()) {
          await this.publishMessage(userId, msg, channelId, client);
          const cur = lastSeenIds.get(channelId) ?? 0;
          if (msg.id > cur) lastSeenIds.set(channelId, msg.id);
        }

        const srcId = sourceIdMap.get(channelId);
        if (srcId) await this.sourceRepo.update(srcId, { lastTelegramMsgId: lastSeenIds.get(channelId)! });
      } catch (e: any) {
        this.logger.warn(`Poll error for channel ${channelId}: ${e.message}`);
      }
    }
  }

  async stopClient(userId: string): Promise<void> {
    const prefix = `${userId}:`;
    for (const [key, entry] of this.pendingAlbums) {
      if (key.startsWith(prefix)) {
        clearTimeout(entry.timer);
        this.pendingAlbums.delete(key);
      }
    }
    const watchdog = this.watchdogIntervals.get(userId);
    if (watchdog) {
      clearInterval(watchdog);
      this.watchdogIntervals.delete(userId);
    }
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
    client: TelegramClient,
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
    await this.publishMessage(userId, msg, channelId, client);
  }

  // Shared publish logic (used by both event and poll paths)
  private async publishMessage(userId: string, msg: any, channelId: number, client: TelegramClient): Promise<void> {
    if (msg.groupedId) {
      const key = `${userId}:${String(msg.groupedId)}`;
      const existing = this.pendingAlbums.get(key);
      // Prefer message that has caption text
      const bestMsg = existing && msg.text && !existing.bestMsg.text ? msg : (existing?.bestMsg ?? msg);
      if (existing) clearTimeout(existing.timer);
      const timer = setTimeout(() => {
        this.pendingAlbums.delete(key);
        this.doPublish(userId, bestMsg, channelId, client).catch((e: any) =>
          this.logger.error(`Album publish error: ${e.message}`),
        );
      }, 500);
      this.pendingAlbums.set(key, { bestMsg, channelId, timer });
      return;
    }
    await this.doPublish(userId, msg, channelId, client);
  }

  private async doPublish(userId: string, msg: any, channelId: number, client: TelegramClient): Promise<void> {
    let senderName = 'unknown';
    let senderEntity: any = null;
    try {
      senderEntity = await msg.getSender?.();
      senderName =
        (senderEntity as any)?.firstName ??
        (senderEntity as any)?.title ??
        String((senderEntity as any)?.id ?? 'unknown');
    } catch {
      // sender not critical
    }

    const senderId = Number((msg.fromId as any)?.userId ?? 0);
    const avatarEntityId = senderId !== 0 ? senderId : channelId;
    if (senderEntity) {
      this.cacheAvatarIfNeeded(client, senderEntity, avatarEntityId).catch(() => {});
    }

    let mediaMimeType: string | undefined;
    const mediaClassName = (msg.media as any)?.className;
    if (mediaClassName === 'MessageMediaPhoto') {
      mediaMimeType = 'image/jpeg';
    } else if (mediaClassName === 'MessageMediaDocument') {
      mediaMimeType = (msg.media as any).document?.mimeType ?? undefined;
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
          mediaMimeType,
          timestamp: new Date(msg.date * 1000).toISOString(),
          replyToMsgId: (msg.replyTo as any)?.replyToMsgId ?? undefined,
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

    if (msg.media) {
      this.cacheMediaIfNeeded(client, msg, channelId).catch((e: any) =>
        this.logger.warn(`Media cache error: ${e.message}`),
      );
    }
  }

  private async cacheMediaIfNeeded(client: TelegramClient, msg: any, channelId: number): Promise<void> {
    const key = `${channelId}_${msg.id}`;
    const existing = await this.mediaRepo.findOne({ where: { key } });
    if (existing) return;

    const className = (msg.media as any)?.className;
    let buffer: Buffer | null = null;
    let mimeType: string | null = null;

    if (className === 'MessageMediaPhoto') {
      buffer = await client.downloadMedia(msg) as Buffer | null;
      mimeType = 'image/jpeg';
    } else if (className === 'MessageMediaDocument') {
      const doc = (msg.media as any).document;
      const docMime: string = doc?.mimeType ?? '';
      if (docMime.startsWith('video/') || docMime.startsWith('image/')) {
        const thumbs = doc?.thumbs?.filter((t: any) => t.className === 'PhotoSize');
        if (thumbs?.length > 0) {
          buffer = await client.downloadMedia(msg, { thumb: thumbs[0] }) as Buffer | null;
          mimeType = 'image/jpeg';
        }
      } else if (docMime.startsWith('audio/')) {
        buffer = await client.downloadMedia(msg) as Buffer | null;
        mimeType = docMime;
      }
    }

    if (!buffer || buffer.length > 1024 * 1024) return;
    await this.mediaRepo.upsert({ key, mimeType, data: buffer.toString('base64') }, ['key']);
    this.logger.log(`Media cached: ${key} (${buffer.length} bytes)`);
  }

  private async cacheAvatarIfNeeded(client: TelegramClient, entity: any, entityId: number): Promise<void> {
    const key = String(entityId);
    if (this.avatarFetchInProgress.has(key)) return;
    const existing = await this.avatarRepo.findOne({ where: { entityId: key } });
    if (existing) return;

    this.avatarFetchInProgress.add(key);
    try {
      const buffer = await client.downloadProfilePhoto(entity, { isBig: false }) as Buffer | null;
      const data = buffer?.length ? buffer.toString('base64') : null;
      await this.avatarRepo.upsert({ entityId: key, data }, ['entityId']);
      this.logger.log(`Avatar cached for entity ${entityId}`);
    } catch (e: any) {
      this.logger.warn(`Could not cache avatar for entity ${entityId}: ${e.message}`);
    } finally {
      this.avatarFetchInProgress.delete(key);
    }
  }

  private async refreshAvatars(client: TelegramClient, entityMap: Map<number, any>): Promise<void> {
    for (const [channelId, entity] of entityMap) {
      try {
        const entityIdStr = String(channelId);
        const existing = await this.avatarRepo.findOne({ where: { entityId: entityIdStr } });
        // Re-download only if never cached
        if (existing) continue;

        const buffer = await client.downloadProfilePhoto(entity, { isBig: false }) as Buffer | null;
        const data = buffer?.length ? buffer.toString('base64') : null;
        await this.avatarRepo.upsert({ entityId: entityIdStr, data }, ['entityId']);
        this.logger.log(`Avatar cached for channel ${channelId} (${data ? buffer!.length + ' bytes' : 'no photo'})`);
      } catch (e: any) {
        this.logger.warn(`Could not download avatar for channel ${channelId}: ${e.message}`);
      }
    }
  }

  async onModuleDestroy() {
    for (const { timer } of this.pendingAlbums.values()) clearTimeout(timer);
    this.pendingAlbums.clear();
    await Promise.all([...this.clients.keys()].map((id) => this.stopClient(id)));
  }
}
