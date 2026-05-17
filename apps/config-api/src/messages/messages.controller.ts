import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get(':pipelineId')
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'before', required: false, type: String })
  findByPipeline(
    @Param('pipelineId') pipelineId: string,
    @Req() req: Request,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.messagesService.findByPipeline(
      pipelineId,
      (req.user as any).id,
      limit ? parseInt(limit, 10) : 50,
      before,
    );
  }
}
