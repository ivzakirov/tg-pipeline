import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PipelineEntity } from './pipeline.entity';
import { PipelineSourceEntity } from './pipeline-source.entity';
import { SourceEntity } from '../sources/source.entity';
import { PipelinesService } from './pipelines.service';
import { PipelinesController } from './pipelines.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PipelineEntity, PipelineSourceEntity, SourceEntity])],
  providers: [PipelinesService],
  controllers: [PipelinesController],
  exports: [PipelinesService],
})
export class PipelinesModule {}
