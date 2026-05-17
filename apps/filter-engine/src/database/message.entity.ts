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

  @CreateDateColumn()
  receivedAt: Date;
}
