import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageEntity } from './message.entity';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { PipelineEntity } from '../pipelines/pipeline.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MessageEntity, PipelineEntity])],
  providers: [MessagesService],
  controllers: [MessagesController],
  exports: [MessagesService],
})
export class MessagesModule {}
