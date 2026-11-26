import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './utils/transform.interceptor.js';
import { setupSwagger } from './common/swagger/setup-swagger.js';
import { configureRawBody } from './common/http/raw-body.js';
import { UPLOADS_DIR } from './common/storage/local-storage.service.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  bodyParser: false,
});
configureRawBody(app);

  app.enableCors({
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  });

  // Uploaded cover images are served as read-only static files.
  app.useStaticAssets(join(process.cwd(), UPLOADS_DIR), {
    prefix: `/${UPLOADS_DIR}/`,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  setupSwagger(app);
  await app.listen(process.env.PORT ?? 4000);
}
await bootstrap();
