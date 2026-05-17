import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('telegram_sessions')
export class TelegramSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @Column()
  sessionStringEncrypted: string;

  @Column({ nullable: true })
  phone: string;

  @UpdateDateColumn()
  lastUsedAt: Date;
}
