import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { assurerDossierUploads } from './uploads/uploads.constants';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Échec immédiat au démarrage si le secret JWT est absent : mieux vaut ne pas
  // démarrer que signer les tokens avec une valeur de repli (cf. auth.module.ts).
  if (!process.env.JWT_SECRET) {
    throw new Error(
      'JWT_SECRET est absent du fichier backend/.env — démarrage interrompu.',
    );
  }

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',')
      .map((o) => o.trim())
      .filter(Boolean) ?? ['http://localhost:5173'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix('api');

  // Images téléversées (photo d'un service, du bureau…). Servies hors du
  // préfixe /api : ce sont des fichiers, pas des points d'entrée d'API.
  // `maxAge` autorise le cache navigateur — le nom de chaque fichier est
  // unique, une image ne change donc jamais de contenu sous la même adresse.
  app.useStaticAssets(assurerDossierUploads(), { prefix: '/uploads', maxAge: '7d' });

  const config = new DocumentBuilder()
    .setTitle('RendezVousApp API')
    .setDescription('API de la plateforme de gestion de rendez-vous (Admin / Professionnel / Réceptionniste / Client)')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  try {
    await app.listen(port);
  } catch (err: any) {
    if (err?.code === 'EADDRINUSE') {
      // Un autre serveur occupe déjà le port : le frontend dialoguerait alors
      // avec la mauvaise API (rôles/comptes différents) sans erreur visible.
      throw new Error(
        `Le port ${port} est déjà utilisé par un autre processus. ` +
          "Arrêtez-le avant de démarrer cette API, sinon le frontend interrogera le mauvais backend. " +
          `Sous Windows : netstat -ano | findstr :${port} puis taskkill /PID <pid> /F`,
      );
    }
    throw err;
  }
  // eslint-disable-next-line no-console
  console.log(`RendezVousApp API démarrée sur http://localhost:${port}/api (docs: /api/docs)`);
}
bootstrap();
