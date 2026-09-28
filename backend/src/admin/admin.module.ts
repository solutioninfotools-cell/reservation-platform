import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AppointmentsModule } from '../appointments/appointments.module';
import { UploadService } from '../upload/upload.service';

@Module({
  imports: [AppointmentsModule],
  controllers: [AdminController],
  providers: [AdminService, UploadService],
})
export class AdminModule {}