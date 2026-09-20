import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { CreateRdvDto } from '../appointments/dto/create-rdv.dto';

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(private publicService: PublicService, private appointments: AppointmentsService) {}

  @Get('espace')
  getEspace() {
    return this.publicService.getEspace();
  }

  @Get('professionnels/:id/services')
  getServices(@Param('id') id: string) {
    return this.publicService.getServices(id);
  }

  @Get('professionnels/:id/creneaux')
  getSlots(@Param('id') id: string, @Query('serviceId') serviceId: string, @Query('date') date: string) {
    return this.appointments.getAvailableSlots(id, serviceId, date);
  }

  @Post('rendez-vous')
  createRdv(@Body() dto: CreateRdvDto) {
    return this.appointments.create(dto, 'EN_LIGNE');
  }

  @Get('rendez-vous/:token')
  getByToken(@Param('token') token: string) {
    return this.appointments.findByManageToken(token);
  }

  @Post('rendez-vous/:token/annuler')
  cancelByClient(@Param('token') token: string) {
    return this.appointments.cancelByClient(token);
  }
}
