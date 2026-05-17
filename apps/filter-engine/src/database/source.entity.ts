import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sources')
export class SourceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ownerId: string;

  @Column({ type: 'bigint' })
  telegramId: number;

  @Column({ default: true })
  enabled: boolean;
}
