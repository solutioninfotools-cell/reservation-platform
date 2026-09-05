import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AppointmentsService } from './appointments.service';
import { UpdateStatusDto } from './dto/update-status.dto';
import { RescheduleDto } from './dto/reschedule.dto';

/**
 * Routes protégées de gestion des rendez-vous — utilisées par les espaces
 * Professionnel et Réceptionniste. La création publique (Client) est exposée
 * séparément dans le module `public` (aucune authentification requise, cf. CDC :
 * le client n'a pas de compte).
 */
@ApiTags('appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private appointments: AppointmentsService) {}

  @Roles('PROFESSIONNEL', 'RECEPTIONNISTE', 'ADMIN')
  @Get()
  list(
    @Query('professionnelId') professionnelId?: string,
    @Query('statut') statut?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
  ) {
    return this.appointments.list({ professionnelId, statut, dateFrom, dateTo, search });
  }

  @Roles('PROFESSIONNEL', 'RECEPTIONNISTE', 'ADMIN')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.appointments.findOne(id);
  }

  @Roles('PROFESSIONNEL', 'RECEPTIONNISTE')
  @RequirePermissions('peutGererRdv')
  @Patch(':id/status')
  updateStatus(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.appointments.updateStatus(id, dto, user.userId);
  }

  @Roles('PROFESSIONNEL', 'RECEPTIONNISTE')
  @RequirePermissions('peutGererRdv')
  @Patch(':id/reschedule')
  reschedule(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: RescheduleDto) {
    return this.appointments.reschedule(id, dto, user.userId);
  }
}
