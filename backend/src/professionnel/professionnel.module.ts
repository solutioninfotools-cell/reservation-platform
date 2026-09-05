import { Module } from '@nestjs/common';
import { ProfessionnelService } from './professionnel.service';
import { ProfessionnelController } from './professionnel.controller';

@Module({
  controllers: [ProfessionnelController],
  providers: [ProfessionnelService],
  exports: [ProfessionnelService],
})
export class ProfessionnelModule {}
