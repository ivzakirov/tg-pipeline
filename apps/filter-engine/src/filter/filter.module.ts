import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PipelineEntity } from '../database/pipeline.entity';
import { PipelineSourceEntity } from '../database/pipeline-source.entity';
import { MessageEntity } from '../database/message.entity';
import { SourceEntity } from '../database/source.entity';
import { PipelineIndexService } from './pipeline-index.service';
import { FilterProcessorService } from './filter-processor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PipelineEntity, PipelineSourceEntity, MessageEntity, SourceEntity]),
  ],
  providers: [PipelineIndexService, FilterProcessorService],
  exports: [PipelineIndexService, FilterProcessorService],
})
export class FilterModule {}
