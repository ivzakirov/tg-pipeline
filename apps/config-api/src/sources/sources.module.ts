import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SourceEntity } from './source.entity';
import { SourcesService } from './sources.service';
import { SourcesController } from './sources.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SourceEntity])],
  providers: [SourcesService],
  controllers: [SourcesController],
  exports: [SourcesService],
})
export class SourcesModule {}
