import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventsGateway } from './events.gateway';

@Global()
@Module({
  imports: [
    // Même précaution que dans AuthModule : `registerAsync` résout le secret une
    // fois le .env chargé, sinon les jetons seraient vérifiés avec une valeur
    // de repli et toute adhésion aux rooms échouerait.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class WebsocketModule {}
