import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from '../users/user.entity';

@Entity('telegram_sessions')
export class TelegramSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, (u) => u.telegramSessions, { onDelete: 'CASCADE' })
  user: UserEntity;

  @Column({ unique: true })
  userId: string;

  @Column()
  sessionStringEncrypted: string;

  @Column({ nullable: true })
  phone: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  lastUsedAt: Date;
}
