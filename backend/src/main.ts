import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AuthService } from './auth/auth.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: 'http://localhost:3001' });
  app.setGlobalPrefix('api');

  await app.get(AuthService).seedAdmin();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`ISP API running on http://localhost:${port}/api`);
}
bootstrap();
