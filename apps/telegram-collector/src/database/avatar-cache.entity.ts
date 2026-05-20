import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('avatar_cache')
export class AvatarCacheEntity {
  @PrimaryColumn({ type: 'bigint' })
  entityId: string;

  @Column({ type: 'text', nullable: true })
  data: string | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
