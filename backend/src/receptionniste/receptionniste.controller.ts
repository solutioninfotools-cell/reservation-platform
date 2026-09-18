import { Body, Controller, Get, Post,  Param,  Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

import { ReceptionnisteService } from './receptionniste.service';
import { CreateRdvDto } from '../appointments/dto/create-rdv.dto';

@ApiTags('receptionniste')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('RECEPTIONNISTE')
@Controller('receptionniste')
export class ReceptionnisteController {

  constructor(
    private readonly receptionnisteService: ReceptionnisteService
  ) {}

  @Get('affectations')
  affectations(@CurrentUser() user: any) {
    return this.receptionnisteService.mesAffectations(user.userId);
  }

  @Get('detect-client')
  detect(
    @Query('telephone') telephone?: string,
    @Query('nom') nom?: string,
    @Query('dateNaissance') dateNaissance?: string
  ) {
    return this.receptionnisteService.detecterClient(
      telephone,
      nom,
      dateNaissance
    );
  }

  @Get('professionnels')
  getProfessionnelList(@CurrentUser() user: any) {
    return this.receptionnisteService.professionnels(user.userId);
  }

  @Get('clients')
  clientslist(@Query('search') search?: string) {
    if (search && search.trim() !== '') {
      return this.receptionnisteService.searchClients(search.trim());
    }

    return this.receptionnisteService.getAllClientsWithRdv();
  }

  @Get('rendez-vous')
  getRdvList(@CurrentUser() user: any) {
    return this.receptionnisteService.getRdvList(user.userId);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('peutGererRdv')
  @Post('rendez-vous')
  creerRdv(
    @CurrentUser() user: any,
    @Body() dto: CreateRdvDto
  ) {
    console.log('🔐 USER :', user);
    console.log('📦 DTO :', dto);

    return this.receptionnisteService.creerRdv(
      user.userId,
      dto
    );
  }
  @Get('clients/:id')
getClientById(@Param('id') id: string) {
  return this.receptionnisteService.getClientById(id);
}
@Patch('rendez-vous/:id/statut')
modifierStatutRdv(
  @CurrentUser() user: any,
  @Param('id') id: string,
  @Body('statut') statut: string
) {
  return this.receptionnisteService.modifierStatutRdv(
    user.userId,
    id,
    statut
  );
}

@Patch('rendez-vous/:id/annuler')
annulerRdv(
  @CurrentUser() user: any,
  @Param('id') id: string,
  @Body('motif') motif?: string
) {
  return this.receptionnisteService.annulerRdv(
    user.userId,
    id,
    motif
  );
}
@Patch('rendez-vous/:id/client')
modifierClient(
  @CurrentUser() user: any,
  @Param('id') rdvId: string,
  @Body() dto: any
) {
  return this.receptionnisteService.modifierClient(
    user.userId,
    rdvId,
    dto
  );
}
@Patch('rendez-vous/:id')
modifierRdv(
  @CurrentUser() user: any,
  @Param('id') id: string,
  @Body() dto: any
) {
  return this.receptionnisteService.modifierRdv(
    user.userId,
    id,
    dto
  );
}
@Patch('professionnels/:professionnelId/creneaux')
updateCreneaux(
  @CurrentUser() user: any,
  @Param('professionnelId') professionnelId: string,
  @Body()
  body: {
    creneaux: {
      jourSemaine: number;
      heureDebut: string;
      heureFin: string;
    }[];
  }
) {

  return this.receptionnisteService.updateCreneaux(

    user.userId,

    professionnelId,

    body.creneaux

  );
}
@Get('professionnels/:professionnelId/creneaux')
getCreneaux(
  @CurrentUser() user: any,
  @Param('professionnelId')
  professionnelId: string
) {

  return this.receptionnisteService.getCreneaux(
    user.userId,
    professionnelId
  );
}
}