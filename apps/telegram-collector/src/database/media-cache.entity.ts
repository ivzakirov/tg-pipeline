import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('media_cache')
export class MediaCacheEntity {
  @PrimaryColumn({ type: 'varchar' })
  key: string; // `${channelId}_${telegramMessageId}`

  @Column({ type: 'varchar', nullable: true })
  mimeType: string | null;

  @Column({ type: 'text', nullable: true })
  data: string | null; // base64

  @UpdateDateColumn()
  updatedAt: Date;
}
