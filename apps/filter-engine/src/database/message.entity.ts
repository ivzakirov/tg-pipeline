import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('messages')
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  pipelineId: string;

  @Column({ type: 'bigint' })
  telegramMessageId: number;

  @Column({ type: 'bigint' })
  channelId: number;

  @Column({ type: 'bigint' })
  senderId: number;

  @Column()
  senderName: string;

  @Column({ type: 'text', nullable: true })
  text: string;

  @Column({ nullable: true })
  mediaType: string;

  @Column({ nullable: true })
  mediaUrl: string;

  @Column({ type: 'varchar', nullable: true })
  mediaMimeType: string | null;

  @Column({ type: 'bigint', nullable: true })
  replyToMsgId: number | null;

  @Column({ type: 'text', nullable: true })
  replyToText: string | null;

  @Column({ type: 'varchar', nullable: true })
  replyToSenderName: string | null;

  @CreateDateColumn()
  receivedAt: Date;
}
