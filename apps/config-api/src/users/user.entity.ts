import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SourceEntity } from '../sources/source.entity';
import { PipelineEntity } from '../pipelines/pipeline.entity';
import { TelegramSessionEntity } from '../telegram-auth/telegram-session.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => SourceEntity, (s) => s.owner)
  sources: SourceEntity[];

  @OneToMany(() => PipelineEntity, (p) => p.owner)
  pipelines: PipelineEntity[];

  @OneToMany(() => TelegramSessionEntity, (ts) => ts.user)
  telegramSessions: TelegramSessionEntity[];
}
