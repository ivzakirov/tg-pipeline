import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvatarCacheEntity } from './avatar-cache.entity';
import { AvatarsController } from './avatars.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AvatarCacheEntity])],
  controllers: [AvatarsController],
})
export class AvatarsModule {}
