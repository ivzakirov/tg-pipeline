import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PipelineEntity } from '../pipelines/pipeline.entity';

@Entity('messages')
@Index(['pipeline', 'receivedAt'])
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PipelineEntity, (p) => p.messages, { onDelete: 'CASCADE' })
  pipeline: PipelineEntity;

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
