import { config } from 'dotenv';
config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Increase payload limit for large Base64 mediaUrls
  import('body-parser').then(bodyParser => {
    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
  });

  // Enable CORS so your separate ReactJS project can communicate with this API
  app.enableCors({
    origin: '*', // We can lock this down to your specific frontend URL later (e.g. 'https://yourreactapp.com')
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
