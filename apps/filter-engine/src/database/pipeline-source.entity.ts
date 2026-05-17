import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PipelineEntity } from './pipeline.entity';

@Entity('pipeline_sources')
export class PipelineSourceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PipelineEntity, (p) => p.pipelineSources)
  pipeline: PipelineEntity;

  @Column()
  sourceId: string;
}
