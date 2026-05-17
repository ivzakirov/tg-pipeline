import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SourcesService, CreateSourceDto, UpdateSourceDto } from './sources.service';

@ApiTags('sources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sources')
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get()
  findAll(@Req() req: Request) {
    return this.sourcesService.findAll((req.user as any).id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.sourcesService.findOne(id, (req.user as any).id);
  }

  @Post()
  create(@Body() dto: CreateSourceDto, @Req() req: Request) {
    return this.sourcesService.create((req.user as any).id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSourceDto, @Req() req: Request) {
    return this.sourcesService.update(id, (req.user as any).id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.sourcesService.remove(id, (req.user as any).id);
  }
}
