import 'reflect-metadata';
import { initTracing } from '@tg-pipeline/tracing';
initTracing('filter-engine');
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env['PORT'] ?? 3004);
}
bootstrap();
