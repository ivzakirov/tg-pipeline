import { Controller, Get, Param, Res } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import { AvatarCacheEntity } from './avatar-cache.entity';

@Controller('avatars')
export class AvatarsController {
  constructor(
    @InjectRepository(AvatarCacheEntity)
    private readonly repo: Repository<AvatarCacheEntity>,
  ) {}

  @Get(':entityId')
  async getAvatar(@Param('entityId') entityId: string, @Res() res: Response) {
    const cached = await this.repo.findOne({ where: { entityId } });
    if (!cached?.data) {
      res.status(404).end();
      return;
    }
    const buffer = Buffer.from(cached.data, 'base64');
    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.end(buffer);
  }
}
