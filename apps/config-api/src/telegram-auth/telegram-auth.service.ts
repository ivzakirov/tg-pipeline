import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { computeCheck } from 'telegram/Password';
import { TelegramSessionEntity } from './telegram-session.entity';
import { TelegramCryptoService } from './telegram-crypto.service';
import { TelegramRedisService } from './telegram-redis.service';
import { KafkaService } from '../kafka/kafka.service';

@Injectable()
export class TelegramAuthService {
  private readonly apiId: number;
  private readonly apiHash: string;

  constructor(
    private readonly config: ConfigService,
    private readonly crypto: TelegramCryptoService,
    private readonly redisService: TelegramRedisService,
    private readonly kafka: KafkaService,
    @InjectRepository(TelegramSessionEntity)
    private readonly sessionRepo: Repository<TelegramSessionEntity>,
  ) {
    this.apiId = parseInt(config.getOrThrow('TELEGRAM_API_ID'), 10);
    this.apiHash = config.getOrThrow('TELEGRAM_API_HASH');
  }

  async getStatus(userId: string) {
    const session = await this.sessionRepo.findOne({ where: { userId } });
    return { connected: !!session, phone: session?.phone ?? null };
  }

  async sendCode(userId: string, phone: string) {
    const existing = await this.sessionRepo.findOne({ where: { userId } });
    if (existing) throw new ConflictException('Telegram account already connected');

    const client = new TelegramClient(new StringSession(''), this.apiId, this.apiHash, {
      connectionRetries: 3,
    });
    await client.connect();

    const result = await client.sendCode({ apiId: this.apiId, apiHash: this.apiHash }, phone);
    const sessionString = (client.session as StringSession).save();
    await client.disconnect();

    await this.redisService.setState(userId, {
      phoneCodeHash: result.phoneCodeHash,
      phone,
      sessionString,
    });

    return { phoneCodeHash: result.phoneCodeHash };
  }

  async verifyCode(userId: string, phone: string, code: string, phoneCodeHash: string) {
    const state = await this.redisService.getState(userId);
    if (!state) throw new BadRequestException('Auth session expired. Please send code again.');

    const client = new TelegramClient(
      new StringSession(state.sessionString ?? ''),
      this.apiId,
      this.apiHash,
      { connectionRetries: 3 },
    );
    await client.connect();

    try {
      await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: phone,
          phoneCodeHash,
          phoneCode: code,
        }),
      );
    } catch (err: any) {
      await client.disconnect();
      if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        const updatedSession = (client.session as StringSession).save();
        await this.redisService.setState(userId, { ...state, sessionString: updatedSession });
        return { requiresPassword: true };
      }
      throw new BadRequestException(`Telegram auth failed: ${err.message}`);
    }

    const sessionString = (client.session as StringSession).save();
    await client.disconnect();

    await this.saveSession(userId, phone, sessionString);
    await this.redisService.deleteState(userId);
    return { requiresPassword: false };
  }

  async verify2fa(userId: string, password: string) {
    const state = await this.redisService.getState(userId);
    if (!state?.sessionString) throw new BadRequestException('Auth session expired.');

    const client = new TelegramClient(
      new StringSession(state.sessionString),
      this.apiId,
      this.apiHash,
      { connectionRetries: 3 },
    );
    await client.connect();

    try {
      const passwordInfo = await client.invoke(new Api.account.GetPassword());
      const srpCheck = await computeCheck(passwordInfo, password);
      await client.invoke(new Api.auth.CheckPassword({ password: srpCheck }));
    } catch (err: any) {
      await client.disconnect();
      throw new BadRequestException(`Invalid 2FA password: ${err.message}`);
    }

    const sessionString = (client.session as StringSession).save();
    await client.disconnect();

    await this.saveSession(userId, state.phone, sessionString);
    await this.redisService.deleteState(userId);
    return { connected: true };
  }

  async disconnect(userId: string) {
    const session = await this.sessionRepo.findOne({ where: { userId } });
    if (!session) throw new NotFoundException('No Telegram session found');
    await this.sessionRepo.remove(session);
    this.kafka.emitTelegramChanged({ userId, action: 'disconnected' });
  }

  private async saveSession(userId: string, phone: string, sessionString: string) {
    const encrypted = this.crypto.encrypt(sessionString);
    const entity = this.sessionRepo.create({ userId, phone, sessionStringEncrypted: encrypted });
    await this.sessionRepo.save(entity);
    this.kafka.emitTelegramChanged({ userId, action: 'connected' });
  }
}
