import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sources')
export class SourceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ownerId: string;

  @Column({ type: 'bigint' })
  telegramId: number;

  @Column()
  name: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ type: 'bigint', default: 0 })
  lastTelegramMsgId: number;
}
