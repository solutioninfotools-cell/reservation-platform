import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ConfigWizardModule } from './config/config.module';
import { AdminModule } from './admin/admin.module';
import { ProfessionnelModule } from './professionnel/professionnel.module';
import { ReceptionnisteModule } from './receptionniste/receptionniste.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { PublicModule } from './public/public.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { EmailModule } from './email/email.module';
import { AssistantModule } from './assistant/assistant.module';
import { WebsocketModule } from './websocket/websocket.module';
import { ClientsModule } from './clients/clients.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuditModule,
    EmailModule,
    NotificationsModule,
    WebsocketModule,
    ClientsModule,
    AuthModule,
    ConfigWizardModule,
    AdminModule,
    ProfessionnelModule,
    ReceptionnisteModule,
    AppointmentsModule,
    PublicModule,
    AssistantModule,
  ],
})
export class AppModule {}
