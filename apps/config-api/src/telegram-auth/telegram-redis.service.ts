import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const TTL_SECONDS = 300; // 5 minutes

interface TelegramAuthState {
  phoneCodeHash: string;
  phone: string;
  sessionString?: string;
}

@Injectable()
export class TelegramRedisService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    this.redis = new Redis(config.getOrThrow('REDIS_URL'));
  }

  async setState(userId: string, state: TelegramAuthState): Promise<void> {
    await this.redis.setex(`tg_auth:${userId}`, TTL_SECONDS, JSON.stringify(state));
  }

  async getState(userId: string): Promise<TelegramAuthState | null> {
    const raw = await this.redis.get(`tg_auth:${userId}`);
    return raw ? (JSON.parse(raw) as TelegramAuthState) : null;
  }

  async deleteState(userId: string): Promise<void> {
    await this.redis.del(`tg_auth:${userId}`);
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
