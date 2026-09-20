import { Module } from '@nestjs/common';
import { ReceptionnisteService } from './receptionniste.service';
import { ReceptionnisteController } from './receptionniste.controller';
import { ClientsModule } from '../clients/clients.module';
import { AppointmentsModule } from '../appointments/appointments.module';

@Module({
  imports: [ClientsModule, AppointmentsModule],
  controllers: [ReceptionnisteController],
  providers: [ReceptionnisteService],
})
export class ReceptionnisteModule {}
