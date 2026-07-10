import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOrigin = process.env.CORS_ORIGIN?.trim();
  app.enableCors({
    origin:
      !corsOrigin || corsOrigin === '*'
        ? true
        : corsOrigin.split(',').map((s) => s.trim()),
  });
  const port = process.env.PORT ?? 5004;
  await app.listen(port, '::');
  // eslint-disable-next-line no-console
  console.log(`messaging-service listening on port ${port}`);
}
bootstrap();
