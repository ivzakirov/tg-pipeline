import { Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PipelineEntity } from './pipeline.entity';
import { SourceEntity } from '../sources/source.entity';

@Entity('pipeline_sources')
export class PipelineSourceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PipelineEntity, (p) => p.pipelineSources, { onDelete: 'CASCADE' })
  pipeline: PipelineEntity;

  @ManyToOne(() => SourceEntity, (s) => s.pipelineSources, { onDelete: 'CASCADE' })
  source: SourceEntity;
}
