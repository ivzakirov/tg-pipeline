import 'reflect-metadata';
import { initTracing } from '@tg-pipeline/tracing';
initTracing('telegram-collector');
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env['PORT'] ?? 3003);
}
bootstrap();
