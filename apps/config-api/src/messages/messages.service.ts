import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageEntity } from './message.entity';
import { PipelineEntity } from '../pipelines/pipeline.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly messageRepo: Repository<MessageEntity>,
    @InjectRepository(PipelineEntity)
    private readonly pipelineRepo: Repository<PipelineEntity>,
  ) {}

  async findByPipeline(
    pipelineId: string,
    userId: string,
    limit = 50,
    before?: string,
  ): Promise<MessageEntity[]> {
    const pipeline = await this.pipelineRepo.findOne({
      where: { id: pipelineId, ownerId: userId },
    });
    if (!pipeline) throw new NotFoundException('Pipeline not found');

    const qb = this.messageRepo
      .createQueryBuilder('m')
      .where('m.pipelineId = :pipelineId', { pipelineId })
      .orderBy('m.receivedAt', 'DESC')
      .take(limit);

    if (before) {
      qb.andWhere('m.receivedAt < :before', { before: new Date(before) });
    }

    return qb.getMany();
  }
}
