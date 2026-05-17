import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PipelinesService, CreatePipelineDto, UpdatePipelineDto } from './pipelines.service';

@ApiTags('pipelines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pipelines')
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @Get()
  findAll(@Req() req: Request) {
    return this.pipelinesService.findAll((req.user as any).id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.pipelinesService.findOne(id, (req.user as any).id);
  }

  @Post()
  create(@Body() dto: CreatePipelineDto, @Req() req: Request) {
    return this.pipelinesService.create((req.user as any).id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePipelineDto, @Req() req: Request) {
    return this.pipelinesService.update(id, (req.user as any).id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.pipelinesService.remove(id, (req.user as any).id);
  }
}
