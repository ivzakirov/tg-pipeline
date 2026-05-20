import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaCacheEntity } from './media-cache.entity';
import { MediaController } from './media.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MediaCacheEntity])],
  controllers: [MediaController],
})
export class MediaModule {}
