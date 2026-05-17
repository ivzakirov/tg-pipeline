import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HealthIndicatorResult } from '@nestjs/terminus';
import { TelegramClientManager } from '../collector/telegram-client-manager.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly manager: TelegramClientManager,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      (): HealthIndicatorResult => ({
        telegram: {
          status: 'up',
          activeClients: this.manager.getActiveCount(),
        },
      }),
    ]);
  }
}
