import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PipelineSourceEntity } from './pipeline-source.entity';
import type { FilterGroup } from '@tg-pipeline/shared-types';

@Entity('pipelines')
export class PipelineEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ownerId: string;

  @Column()
  name: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ type: 'jsonb', nullable: true })
  filterConfig: FilterGroup | null;

  @OneToMany(() => PipelineSourceEntity, (ps) => ps.pipeline)
  pipelineSources: PipelineSourceEntity[];
}
