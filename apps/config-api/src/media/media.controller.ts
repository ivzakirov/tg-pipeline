import { Controller, Get, Param, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import { MediaCacheEntity } from './media-cache.entity';

@SkipThrottle()
@Controller('media')
export class MediaController {
  constructor(
    @InjectRepository(MediaCacheEntity)
    private readonly repo: Repository<MediaCacheEntity>,
  ) {}

  @Get(':channelId/:messageId')
  async getMedia(
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
    @Res() res: Response,
  ): Promise<void> {
    const cached = await this.repo.findOne({ where: { key: `${channelId}_${messageId}` } });
    if (!cached?.data) {
      res.status(404).end();
      return;
    }
    res.set('Content-Type', cached.mimeType ?? 'application/octet-stream');
    res.set('Cache-Control', 'public, max-age=86400');
    res.end(Buffer.from(cached.data, 'base64'));
  }
}
