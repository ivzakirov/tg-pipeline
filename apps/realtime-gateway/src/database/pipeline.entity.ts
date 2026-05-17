import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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
}
