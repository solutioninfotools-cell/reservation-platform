import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * IMPORTANT — ne jamais revenir à `JwtModule.register({ secret: process.env.JWT_SECRET })`.
 * Le corps de ce module est évalué à l'import, donc AVANT que `ConfigModule.forRoot()`
 * (déclaré dans AppModule) n'ait chargé le fichier .env : `process.env.JWT_SECRET` y est
 * encore `undefined`. Les tokens étaient alors SIGNÉS avec la valeur de repli, puis
 * VÉRIFIÉS par JwtStrategy (instanciée plus tard) avec le vrai secret du .env
 * → « invalid signature » et 401 sur toutes les routes protégées.
 * `registerAsync` résout le secret à l'instanciation, une fois le .env chargé.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') ?? '8h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
