import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SourceEntity } from './source.entity';
import { KafkaService } from '../kafka/kafka.service';
import { IsString, IsNumber, IsIn, IsOptional, IsBoolean } from 'class-validator';

export class CreateSourceDto {
  @IsString() name: string;
  @IsNumber() telegramId: number;
  @IsOptional() @IsString() telegramUsername?: string;
  @IsIn(['channel', 'group']) type: 'channel' | 'group';
}

export class UpdateSourceDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
}

@Injectable()
export class SourcesService {
  constructor(
    @InjectRepository(SourceEntity)
    private readonly repo: Repository<SourceEntity>,
    private readonly kafka: KafkaService,
  ) {}

  async findAll(userId: string): Promise<SourceEntity[]> {
    return this.repo.find({ where: { ownerId: userId } });
  }

  async findOne(id: string, userId: string): Promise<SourceEntity> {
    const source = await this.repo.findOne({ where: { id, ownerId: userId } });
    if (!source) throw new NotFoundException('Source not found');
    return source;
  }

  async create(userId: string, dto: CreateSourceDto): Promise<SourceEntity> {
    const source = this.repo.create({ ...dto, ownerId: userId });
    const saved = await this.repo.save(source);
    this.kafka.emitSourceChanged({ userId, action: 'created', sourceId: saved.id });
    return saved;
  }

  async update(id: string, userId: string, dto: UpdateSourceDto): Promise<SourceEntity> {
    const source = await this.findOne(id, userId);
    Object.assign(source, dto);
    const saved = await this.repo.save(source);
    this.kafka.emitSourceChanged({ userId, action: 'updated', sourceId: saved.id });
    return saved;
  }

  async remove(id: string, userId: string): Promise<void> {
    const source = await this.findOne(id, userId);
    await this.repo.remove(source);
    this.kafka.emitSourceChanged({ userId, action: 'deleted', sourceId: id });
  }
}
