import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { CustomExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Set up logger
    logger: new ConsoleLogger({
      logLevels: ['log', 'fatal', 'warn', 'error', 'debug', 'verbose'],
      timestamp: true,
      prefix: 'Chris Bolts App',
      json: true,
      colors: true,
    }),
  });

  // Allow CORS
  app.enableCors({
    origin: ['http://localhost:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Set up global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new CustomExceptionFilter());

  // Set up Swagger API (for development only!!!)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('POS and IMS')
      .setDescription('POS and IMS API description')
      .setVersion('1.0')
      .addTag('pos and ims')
      .addBearerAuth()
      .addSecurityRequirements('bearer')
      .build();

    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, documentFactory);
  }

  // Run app
  await app.listen(process.env.PORT ?? process.env.API_PORT ?? 3000);
}
bootstrap();
