import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipelineEntity } from '../database/pipeline.entity';
import { SourceEntity } from '../database/source.entity';

interface IndexedPipeline {
  id: string;
  ownerId: string;
  name: string;
  filterConfig: PipelineEntity['filterConfig'];
}

@Injectable()
export class PipelineIndexService implements OnModuleInit {
  private readonly logger = new Logger(PipelineIndexService.name);

  // Map<userId, Map<channelId, Pipeline[]>>
  private readonly index = new Map<string, Map<number, IndexedPipeline[]>>();

  constructor(
    @InjectRepository(PipelineEntity)
    private readonly pipelineRepo: Repository<PipelineEntity>,
    @InjectRepository(SourceEntity)
    private readonly sourceRepo: Repository<SourceEntity>,
  ) {}

  async onModuleInit() {
    await this.rebuildIndex();
  }

  async rebuildIndex() {
    this.index.clear();
    const pipelines = await this.pipelineRepo.find({
      where: { enabled: true },
      relations: ['pipelineSources'],
    });

    for (const p of pipelines) {
      for (const ps of p.pipelineSources) {
        const source = await this.sourceRepo.findOne({ where: { id: ps.sourceId } });
        if (!source || !source.enabled) continue;
        this.addToIndex(p.ownerId, Number(source.telegramId), {
          id: p.id,
          ownerId: p.ownerId,
          name: p.name,
          filterConfig: p.filterConfig,
        });
      }
    }

    this.logger.log(`Index rebuilt: ${pipelines.length} pipelines`);
  }

  async reloadPipeline(pipelineId: string, action: 'created' | 'updated' | 'deleted') {
    if (action === 'deleted') {
      this.removePipelineFromIndex(pipelineId);
      return;
    }

    const pipeline = await this.pipelineRepo.findOne({
      where: { id: pipelineId, enabled: true },
      relations: ['pipelineSources'],
    });

    this.removePipelineFromIndex(pipelineId);
    if (!pipeline) return;

    for (const ps of pipeline.pipelineSources) {
      const source = await this.sourceRepo.findOne({ where: { id: ps.sourceId } });
      if (!source || !source.enabled) continue;
      this.addToIndex(pipeline.ownerId, Number(source.telegramId), {
        id: pipeline.id,
        ownerId: pipeline.ownerId,
        name: pipeline.name,
        filterConfig: pipeline.filterConfig,
      });
    }
  }

  getPipelinesForMessage(userId: string, channelId: number): IndexedPipeline[] {
    return this.index.get(userId)?.get(channelId) ?? [];
  }

  private addToIndex(userId: string, channelId: number, pipeline: IndexedPipeline) {
    if (!this.index.has(userId)) this.index.set(userId, new Map());
    const userMap = this.index.get(userId)!;
    const existing = userMap.get(channelId) ?? [];
    userMap.set(channelId, [...existing, pipeline]);
  }

  private removePipelineFromIndex(pipelineId: string) {
    for (const [, userMap] of this.index) {
      for (const [channelId, pipelines] of userMap) {
        userMap.set(channelId, pipelines.filter((p) => p.id !== pipelineId));
      }
    }
  }
}
