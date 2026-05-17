import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from '../users/user.entity';
import { PipelineSourceEntity } from './pipeline-source.entity';
import { MessageEntity } from '../messages/message.entity';
import type { FilterGroup } from '@tg-pipeline/shared-types';

@Entity('pipelines')
export class PipelineEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, (u) => u.pipelines, { onDelete: 'CASCADE' })
  owner: UserEntity;

  @Column()
  ownerId: string;

  @Column()
  name: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ type: 'jsonb', nullable: true })
  filterConfig: FilterGroup | null;

  @OneToMany(() => PipelineSourceEntity, (ps) => ps.pipeline, { cascade: true })
  pipelineSources: PipelineSourceEntity[];

  @OneToMany(() => MessageEntity, (m) => m.pipeline)
  messages: MessageEntity[];
}
