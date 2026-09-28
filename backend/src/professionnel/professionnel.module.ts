import { Module } from '@nestjs/common';
import { ProfessionnelService } from './professionnel.service';
import { ProfessionnelController } from './professionnel.controller';
import { UploadService } from '../upload/upload.service';
import { AppointmentsModule } from '../appointments/appointments.module';

@Module({
  // AppointmentsModule fournit le moteur de créneaux, la création de rendez-vous
  // et les règles de réservation : l'espace Professionnel les réutilise plutôt
  // que d'en dupliquer la logique.
  imports: [AppointmentsModule],
  controllers: [ProfessionnelController],
  providers: [ProfessionnelService, UploadService],
  exports: [ProfessionnelService],
})
export class ProfessionnelModule {}