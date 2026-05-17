import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';
import { PipelineSourceEntity } from '../pipelines/pipeline-source.entity';

@Entity('sources')
@Unique(['owner', 'telegramId'])
export class SourceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, (u) => u.sources, { onDelete: 'CASCADE' })
  owner: UserEntity;

  @Column()
  ownerId: string;

  @Column()
  name: string;

  @Column({ type: 'bigint' })
  telegramId: number;

  @Column({ nullable: true })
  telegramUsername: string;

  @Column({ type: 'varchar' })
  type: 'channel' | 'group';

  @Column({ default: true })
  enabled: boolean;

  @OneToMany(() => PipelineSourceEntity, (ps) => ps.source)
  pipelineSources: PipelineSourceEntity[];
}
