import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { UserEntity } from '../users/user.entity';
import { SourceEntity } from '../sources/source.entity';
import { PipelineEntity } from '../pipelines/pipeline.entity';
import { PipelineSourceEntity } from '../pipelines/pipeline-source.entity';
import { MessageEntity } from '../messages/message.entity';
import { TelegramSessionEntity } from '../telegram-auth/telegram-session.entity';
import { RefreshTokenEntity } from '../auth/refresh-token.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env['DATABASE_URL'],
  entities: [
    UserEntity,
    SourceEntity,
    PipelineEntity,
    PipelineSourceEntity,
    MessageEntity,
    TelegramSessionEntity,
    RefreshTokenEntity,
  ],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
