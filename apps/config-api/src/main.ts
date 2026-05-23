import 'reflect-metadata';
import { initTracing } from '@tg-pipeline/tracing';
// Must run before AppModule (and its imports: TypeORM pg, KafkaJS) are loaded
initTracing('config-api');
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  app.enableCors({ origin: process.env['CORS_ORIGIN'] ?? true, credentials: true });

  const config = new DocumentBuilder()
    .setTitle('TG Pipeline API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  await app.listen(process.env['PORT'] ?? 3001);
}

bootstrap();
