import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProfessionnelService } from './professionnel.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import { CreateDisponibiliteDto, CreateIndisponibiliteDto, UpdateDisponibiliteDto } from './dto/disponibilite.dto';
import { SetAffectationActiveDto, UpdatePermissionsDto } from './dto/affectation.dto';
import { CreateChampDto, UpdateChampDto } from './dto/champ.dto';
import { NoteClientDto, UpdateClientDto } from './dto/client.dto';
import { UpdateParametresDto } from './dto/parametres.dto';
import { CreateProRdvDto } from './dto/rdv.dto';

/**
 * Espace Professionnel — toutes les routes sont scopées automatiquement au
 * professionnel authentifié via son userId (jamais un id passé librement par le
 * frontend), pour éviter qu'un professionnel modifie les données d'un autre.
 */
@ApiTags('professionnel')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PROFESSIONNEL')
@Controller('professionnel')
export class ProfessionnelController {
  constructor(private pro: ProfessionnelService) {}

  // ---------------- Profil ----------------
  @Get('moi')
  moi(@CurrentUser() user: any) {
    return this.pro.moi(user.userId);
  }

  @Patch('profil')
  updateProfil(@CurrentUser() user: any, @Body() body: any) {
    return this.pro.updateProfil(user.userId, body);
  }

  // ---------------- Services ----------------
  @Get('services')
  async listServices(@CurrentUser() user: any) {
    const me = await this.pro.findByUserId(user.userId);
    return this.pro.listServices(me.id);
  }
  @Post('services')
  createService(@CurrentUser() user: any, @Body() dto: CreateServiceDto) {
    return this.pro.createService(user.userId, dto);
  }
  @Patch('services/:id')
  updateService(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.pro.updateService(user.userId, id, dto);
  }
  @Delete('services/:id')
  deleteService(@CurrentUser() user: any, @Param('id') id: string) {
    return this.pro.deleteService(user.userId, id);
  }

  // ---------------- Champs personnalisés (CDC II.6) ----------------
  @Get('champs-personnalises')
  async listChamps(@CurrentUser() user: any, @Query('serviceId') serviceId?: string) {
    const me = await this.pro.findByUserId(user.userId);
    return this.pro.listChamps(me.id, serviceId);
  }
  @Post('champs-personnalises')
  createChamp(@CurrentUser() user: any, @Body() dto: CreateChampDto) {
    return this.pro.createChamp(user.userId, dto);
  }
  @Patch('champs-personnalises/:id')
  updateChamp(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateChampDto) {
    return this.pro.updateChamp(user.userId, id, dto);
  }
  @Delete('champs-personnalises/:id')
  deleteChamp(@CurrentUser() user: any, @Param('id') id: string) {
    return this.pro.deleteChamp(user.userId, id);
  }

  // ---------------- Disponibilités ----------------
  @Get('disponibilites')
  async listDispo(@CurrentUser() user: any) {
    const me = await this.pro.findByUserId(user.userId);
    return this.pro.listDisponibilites(me.id);
  }
  @Post('disponibilites')
  addDispo(@CurrentUser() user: any, @Body() dto: CreateDisponibiliteDto) {
    return this.pro.addDisponibilite(user.userId, dto);
  }
  @Patch('disponibilites/:id')
  updateDispo(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateDisponibiliteDto) {
    return this.pro.updateDisponibilite(user.userId, id, dto);
  }
  @Delete('disponibilites/:id')
  removeDispo(@CurrentUser() user: any, @Param('id') id: string) {
    return this.pro.removeDisponibilite(user.userId, id);
  }

  // ---------------- Indisponibilités (CDC II.15) ----------------
  @Get('indisponibilites')
  async listIndispo(@CurrentUser() user: any) {
    const me = await this.pro.findByUserId(user.userId);
    return this.pro.listIndisponibilites(me.id);
  }
  @Post('indisponibilites')
  addIndispo(@CurrentUser() user: any, @Body() dto: CreateIndisponibiliteDto) {
    return this.pro.addIndisponibilite(user.userId, dto);
  }
  @Delete('indisponibilites/:id')
  removeIndispo(@CurrentUser() user: any, @Param('id') id: string) {
    return this.pro.removeIndisponibilite(user.userId, id);
  }
  @Post('indisponibilites/:id/notifier')
  notifierIndispo(@CurrentUser() user: any, @Param('id') id: string) {
    return this.pro.notifierIndisponibilite(user.userId, id);
  }

  // ---------------- Rendez-vous (CDC II.14) ----------------
  @Get('rendez-vous')
  async listRdv(
    @CurrentUser() user: any,
    @Query('statut') statut?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
    @Query('serviceId') serviceId?: string,
  ) {
    const me = await this.pro.findByUserId(user.userId);
    return this.pro.listRdv(me.id, user, { statut, dateFrom, dateTo, search, serviceId });
  }
  @Post('rendez-vous')
  creerRdv(@CurrentUser() user: any, @Body() dto: CreateProRdvDto) {
    return this.pro.creerRdv(user.userId, dto);
  }
  @Get('creneaux')
  async creneaux(@CurrentUser() user: any, @Query('serviceId') serviceId: string, @Query('date') date: string) {
    const me = await this.pro.findByUserId(user.userId);
    return this.pro.creneaux(me.id, serviceId, date);
  }

  // ---------------- Clients (CDC II.11) ----------------
  @Get('clients')
  async listClients(@CurrentUser() user: any, @Query('search') search?: string) {
    const me = await this.pro.findByUserId(user.userId);
    return this.pro.listClients(me.id, search);
  }
  @Patch('clients/:id')
  updateClient(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.pro.updateClient(user.userId, id, dto);
  }
  @Get('detect-client')
  detectClient(
    @Query('telephone') telephone?: string,
    @Query('nom') nom?: string,
    @Query('prenom') prenom?: string,
    @Query('dateNaissance') dateNaissance?: string,
  ) {
    return this.pro.detecterClient(telephone, nom, prenom, dateNaissance);
  }

  // ---------------- Notes internes (CDC II.12) ----------------
  @Get('clients/:clientId/notes')
  async listNotes(@CurrentUser() user: any, @Param('clientId') clientId: string) {
    const me = await this.pro.findByUserId(user.userId);
    return this.pro.listNotes(me.id, clientId);
  }
  @Post('clients/:clientId/notes')
  addNote(@CurrentUser() user: any, @Param('clientId') clientId: string, @Body() dto: NoteClientDto) {
    return this.pro.addNote(user.userId, clientId, dto);
  }
  @Patch('notes/:noteId')
  updateNote(@CurrentUser() user: any, @Param('noteId') noteId: string, @Body() dto: NoteClientDto) {
    return this.pro.updateNote(user.userId, noteId, dto);
  }
  @Delete('notes/:noteId')
  deleteNote(@CurrentUser() user: any, @Param('noteId') noteId: string) {
    return this.pro.deleteNote(user.userId, noteId);
  }

  // ---------------- Équipe (CDC II.13) ----------------
  @Get('receptionnistes')
  async listReceptionnistes(@CurrentUser() user: any) {
    const me = await this.pro.findByUserId(user.userId);
    return this.pro.listReceptionnistes(me.id);
  }
  @Patch('receptionnistes/:affectationId/permissions')
  updatePermissions(@CurrentUser() user: any, @Param('affectationId') affectationId: string, @Body() dto: UpdatePermissionsDto) {
    return this.pro.updatePermissions(user.userId, affectationId, dto);
  }
  @Patch('receptionnistes/:affectationId/actif')
  setActive(@CurrentUser() user: any, @Param('affectationId') affectationId: string, @Body() dto: SetAffectationActiveDto) {
    return this.pro.setAffectationActive(user.userId, affectationId, dto.actif);
  }
  @Delete('receptionnistes/:affectationId')
  retirer(@CurrentUser() user: any, @Param('affectationId') affectationId: string) {
    return this.pro.retirerReceptionniste(user.userId, affectationId);
  }

  // ---------------- Paramètres de réservation (CDC II.15bis) ----------------
  @Get('parametres')
  async getParametres(@CurrentUser() user: any) {
    const me = await this.pro.findByUserId(user.userId);
    return this.pro.getParametres(me.id);
  }
  @Patch('parametres')
  updateParametres(@CurrentUser() user: any, @Body() dto: UpdateParametresDto) {
    return this.pro.updateParametres(user.userId, dto);
  }

  // ---------------- Historique des actions (CDC II.17) ----------------
  @Get('historique')
  async historique(@CurrentUser() user: any, @Query('action') action?: string, @Query('take') take?: string) {
    const me = await this.pro.findByUserId(user.userId);
    return this.pro.historique(me.id, { action, take: take ? parseInt(take, 10) : undefined });
  }

  // ---------------- Statistiques (CDC II.18) ----------------
  @Get('stats')
  async stats(
    @CurrentUser() user: any,
    @Query('periode') periode?: string,
    @Query('du') du?: string,
    @Query('au') au?: string,
  ) {
    const me = await this.pro.findByUserId(user.userId);
    return this.pro.stats(me.id, periode, du, au);
  }
}
