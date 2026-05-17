import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { IsString, IsBoolean, IsOptional, IsUUID, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PipelineEntity } from './pipeline.entity';
import { PipelineSourceEntity } from './pipeline-source.entity';
import { SourceEntity } from '../sources/source.entity';
import { KafkaService } from '../kafka/kafka.service';
import type { FilterGroup } from '@tg-pipeline/shared-types';

export class CreatePipelineDto {
  @IsString() name: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() filterConfig?: FilterGroup;
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) sourceIds?: string[];
}

export class UpdatePipelineDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() filterConfig?: FilterGroup;
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) sourceIds?: string[];
}

@Injectable()
export class PipelinesService {
  constructor(
    @InjectRepository(PipelineEntity)
    private readonly pipelineRepo: Repository<PipelineEntity>,
    @InjectRepository(PipelineSourceEntity)
    private readonly psRepo: Repository<PipelineSourceEntity>,
    @InjectRepository(SourceEntity)
    private readonly sourceRepo: Repository<SourceEntity>,
    private readonly kafka: KafkaService,
  ) {}

  async findAll(userId: string): Promise<PipelineEntity[]> {
    return this.pipelineRepo.find({
      where: { ownerId: userId },
      relations: ['pipelineSources', 'pipelineSources.source'],
    });
  }

  async findOne(id: string, userId: string): Promise<PipelineEntity> {
    const pipeline = await this.pipelineRepo.findOne({
      where: { id, ownerId: userId },
      relations: ['pipelineSources', 'pipelineSources.source'],
    });
    if (!pipeline) throw new NotFoundException('Pipeline not found');
    return pipeline;
  }

  async create(userId: string, dto: CreatePipelineDto): Promise<PipelineEntity> {
    if (dto.sourceIds?.length) {
      await this.validateSourceOwnership(dto.sourceIds, userId);
    }

    const pipeline = this.pipelineRepo.create({
      ownerId: userId,
      name: dto.name,
      enabled: dto.enabled ?? true,
      filterConfig: dto.filterConfig ?? null,
    });
    const saved = await this.pipelineRepo.save(pipeline);

    if (dto.sourceIds?.length) {
      await this.syncSources(saved.id, dto.sourceIds);
    }

    this.kafka.emitPipelineChanged({ userId, action: 'created', pipelineId: saved.id });
    return this.findOne(saved.id, userId);
  }

  async update(id: string, userId: string, dto: UpdatePipelineDto): Promise<PipelineEntity> {
    const pipeline = await this.findOne(id, userId);

    if (dto.sourceIds !== undefined) {
      await this.validateSourceOwnership(dto.sourceIds, userId);
      await this.syncSources(id, dto.sourceIds);
    }

    if (dto.name !== undefined) pipeline.name = dto.name;
    if (dto.enabled !== undefined) pipeline.enabled = dto.enabled;
    if (dto.filterConfig !== undefined) pipeline.filterConfig = dto.filterConfig;

    await this.pipelineRepo.save(pipeline);
    this.kafka.emitPipelineChanged({ userId, action: 'updated', pipelineId: id });
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const pipeline = await this.findOne(id, userId);
    await this.pipelineRepo.remove(pipeline);
    this.kafka.emitPipelineChanged({ userId, action: 'deleted', pipelineId: id });
  }

  private async validateSourceOwnership(sourceIds: string[], userId: string) {
    const sources = await this.sourceRepo.find({
      where: { id: In(sourceIds), ownerId: userId },
    });
    if (sources.length !== sourceIds.length) {
      throw new BadRequestException('One or more sources not found or not owned by user');
    }
  }

  private async syncSources(pipelineId: string, sourceIds: string[]) {
    await this.psRepo.delete({ pipeline: { id: pipelineId } });
    if (sourceIds.length) {
      const entries = sourceIds.map((sourceId) =>
        this.psRepo.create({ pipeline: { id: pipelineId }, source: { id: sourceId } }),
      );
      await this.psRepo.save(entries);
    }
  }
}
