import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { CollectorModule } from '../collector/collector.module';

@Module({
  imports: [TerminusModule, CollectorModule],
  controllers: [HealthController],
})
export class HealthModule {}
