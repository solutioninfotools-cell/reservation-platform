import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import {
  AffectationDto,
  AnnonceDto,
  AnnulerRdvDto,
  BulkStatutCompteDto,
  CreateCompteDto,
  CreateDomaineDto,
  DeplacerRdvDto,
  ResetPasswordDto,
  SetAffectationsDto,
  SetDomaineDto,
  SetServiceActifDto,
  SetServiceStatutDto,
  UpdateClientDto,
  UpdateDomaineDto,
  UpdateEmailDto,
  UpdateParamsDto,
  UpdatePermissionsAffectationDto,
  UpdateProfessionnelDto,
  UpdateReceptionnisteDto,
  UpdateStatutCompteDto,
} from './dto/admin.dto';

/**
 * Espace Admin — accessible aux comptes ADMIN, et, selon le mode de supervision
 * "Prestataire", au Professionnel désigné superviseur (même rôle fonctionnel
 * côté permissions ; le mode est déterminé lors de la configuration initiale).
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private admin: AdminService) {}

  // ---------------- Professionnels ----------------
  @Get('professionnels')
  @ApiOperation({ summary: 'Liste des professionnels (filtres statut / domaine / recherche)' })
  listPros(@Query('statut') statut?: string, @Query('search') search?: string, @Query('domaineId') domaineId?: string) {
    return this.admin.listProfessionnels({ statut, search, domaineId });
  }

  @Get('professionnels/:id')
  @ApiOperation({ summary: "Fiche détaillée d'un professionnel" })
  getPro(@Param('id') id: string) {
    return this.admin.getProfessionnel(id);
  }

  @Patch('professionnels/:id')
  @ApiOperation({ summary: "Corriger la fiche d'un professionnel (nom, spécialité, coordonnées)" })
  updatePro(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateProfessionnelDto) {
    return this.admin.updateProfessionnel(id, dto, user.userId);
  }

  @Patch('professionnels/:id/domaine')
  @ApiOperation({ summary: "Rattacher un professionnel à un domaine d'activité (null = détacher)" })
  setProDomaine(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: SetDomaineDto) {
    return this.admin.setProfessionnelDomaine(id, dto.domaineId ?? null, user.userId);
  }

  // ---------------- Réceptionnistes ----------------
  @Get('receptionnistes')
  listRecs(@Query('statut') statut?: string, @Query('search') search?: string) {
    return this.admin.listReceptionnistes({ statut, search });
  }

  @Get('receptionnistes/:id')
  getRec(@Param('id') id: string) {
    return this.admin.getReceptionniste(id);
  }

  @Patch('receptionnistes/:id')
  @ApiOperation({ summary: "Corriger la fiche d'une réceptionniste" })
  updateRec(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateReceptionnisteDto) {
    return this.admin.updateReceptionniste(id, dto, user.userId);
  }

  @Put('receptionnistes/:id/affectations')
  @ApiOperation({ summary: "Remplace l'ensemble des professionnels affectés à une réceptionniste" })
  setAffectations(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: SetAffectationsDto) {
    return this.admin.setAffectations(id, dto.professionnelIds, user.userId);
  }

  // ---------------- Comptes (tous rôles) ----------------
  @Patch('comptes/:userId/statut')
  @ApiOperation({ summary: 'Valider / refuser / activer / désactiver un compte' })
  setStatut(@CurrentUser() user: any, @Param('userId') userId: string, @Body() dto: UpdateStatutCompteDto) {
    return this.admin.setStatutCompte(userId, dto.statut, user.userId);
  }

  @Patch('comptes/statut-groupe')
  @ApiOperation({ summary: 'Valider / refuser / activer plusieurs comptes en une fois' })
  setStatutGroupe(@CurrentUser() user: any, @Body() dto: BulkStatutCompteDto) {
    return this.admin.setStatutCompteGroupe(dto.userIds, dto.statut, user.userId);
  }

  @Post('comptes')
  @ApiOperation({ summary: 'Créer un compte Professionnel, Réceptionniste ou Administrateur' })
  createCompte(@CurrentUser() user: any, @Body() dto: CreateCompteDto) {
    return this.admin.createCompte(dto, user.userId);
  }

  @Patch('comptes/:userId/mot-de-passe')
  @ApiOperation({ summary: "Réinitialiser le mot de passe d'un compte" })
  resetPassword(@CurrentUser() user: any, @Param('userId') userId: string, @Body() dto: ResetPasswordDto) {
    return this.admin.resetPassword(userId, dto.password, user.userId);
  }

  @Patch('comptes/:userId/email')
  @ApiOperation({ summary: "Changer l'adresse e-mail de connexion d'un compte" })
  updateEmail(@CurrentUser() user: any, @Param('userId') userId: string, @Body() dto: UpdateEmailDto) {
    return this.admin.updateEmail(userId, dto.email, user.userId);
  }

  @Delete('comptes/:userId')
  @ApiOperation({ summary: 'Supprimer un compte (refusé si des rendez-vous existent)' })
  deleteCompte(@CurrentUser() user: any, @Param('userId') userId: string) {
    return this.admin.deleteCompte(userId, user.userId);
  }

  @Get('users')
  @ApiOperation({ summary: 'Recherche globale : professionnels, réceptionnistes, clients' })
  listUsers(@Query('role') role?: string, @Query('search') search?: string) {
    return this.admin.listUsers({ role, search });
  }

  // ---------------- Affectations ----------------
  @Post('affectations')
  affecter(@CurrentUser() user: any, @Body() dto: AffectationDto) {
    return this.admin.affecter(dto.professionnelId, dto.receptionnisteId, user.userId);
  }

  @Delete('affectations')
  desaffecter(@CurrentUser() user: any, @Body() dto: AffectationDto) {
    return this.admin.desaffecter(dto.professionnelId, dto.receptionnisteId, user.userId);
  }

  @Patch('affectations/:id/permissions')
  updatePermissions(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdatePermissionsAffectationDto) {
    return this.admin.updatePermissionsAffectation(id, dto, user.userId);
  }

  // ---------------- Domaines d'activité ----------------
  @Get('domaines')
  @ApiOperation({ summary: "Domaines d'activité avec le nombre de professionnels rattachés" })
  listDomaines() {
    return this.admin.listDomaines();
  }

  @Post('domaines')
  createDomaine(@CurrentUser() user: any, @Body() dto: CreateDomaineDto) {
    return this.admin.createDomaine(dto, user.userId);
  }

  @Patch('domaines/:id')
  updateDomaine(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateDomaineDto) {
    return this.admin.updateDomaine(id, dto, user.userId);
  }

  @Delete('domaines/:id')
  @ApiOperation({ summary: 'Supprimer un domaine (refusé si des professionnels y sont rattachés)' })
  deleteDomaine(@CurrentUser() user: any, @Param('id') id: string) {
    return this.admin.deleteDomaine(id, user.userId);
  }

  // ---------------- Annonces ----------------
  @Post('annonces')
  @ApiOperation({ summary: 'Diffuser un message aux professionnels et/ou réceptionnistes' })
  envoyerAnnonce(@CurrentUser() user: any, @Body() dto: AnnonceDto) {
    return this.admin.envoyerAnnonce(dto, user.userId);
  }

  // ---------------- Clients ----------------
  @Get('clients')
  listClients(@Query('search') search?: string) {
    return this.admin.listClients({ search });
  }

  @Get('clients/:id')
  getClient(@Param('id') id: string) {
    return this.admin.getClient(id);
  }

  @Patch('clients/:id')
  @ApiOperation({ summary: "Corriger une fiche client (le téléphone reste l'identifiant unique)" })
  updateClient(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.admin.updateClient(id, dto, user.userId);
  }

  @Delete('clients/:id')
  @ApiOperation({ summary: 'Supprimer une fiche client (refusé si elle a des rendez-vous)' })
  deleteClient(@CurrentUser() user: any, @Param('id') id: string) {
    return this.admin.deleteClient(id, user.userId);
  }

  // ---------------- Rendez-vous ----------------
  @Get('rendez-vous')
  listRdv(
    @Query('statut') statut?: string,
    @Query('professionnelId') professionnelId?: string,
    @Query('serviceId') serviceId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.admin.listRendezVous({ statut, professionnelId, serviceId, from, to, search, take: Number(take), skip: Number(skip) });
  }

  @Get('rendez-vous/:id')
  getRdv(@Param('id') id: string) {
    return this.admin.getRendezVous(id);
  }

  @Patch('rendez-vous/:id/annuler')
  @ApiOperation({ summary: 'Annulation administrative (notifie le professionnel et son équipe)' })
  annulerRdv(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: AnnulerRdvDto) {
    return this.admin.annulerRendezVous(id, dto.motif, user.userId);
  }

  @Patch('rendez-vous/:id/deplacer')
  @ApiOperation({ summary: 'Déplacer un rendez-vous (la disponibilité du créneau est revérifiée)' })
  deplacerRdv(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: DeplacerRdvDto) {
    return this.admin.deplacerRendezVous(id, dto.dateDebut, user.userId);
  }

  // ---------------- Services ----------------
  @Get('services')
  @ApiOperation({ summary: 'Services de tous les professionnels (actif = publié, statut = disponibilité)' })
  listServices(
    @Query('search') search?: string,
    @Query('professionnelId') professionnelId?: string,
    @Query('actif') actif?: string,
    @Query('statut') statut?: string,
  ) {
    return this.admin.listServices({ search, professionnelId, actif, statut });
  }

  @Patch('services/:id/actif')
  setServiceActif(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: SetServiceActifDto) {
    return this.admin.setServiceActif(id, dto.actif, user.userId);
  }

  @Patch('services/:id/statut')
  @ApiOperation({ summary: 'Disponibilité affichée au client : DISPONIBLE / COMPLET / INDISPONIBLE' })
  setServiceStatut(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: SetServiceStatutDto) {
    return this.admin.setServiceStatut(id, dto.statut, user.userId);
  }

  @Delete('services/:id')
  @ApiOperation({ summary: 'Supprimer un service (refusé si des rendez-vous y sont rattachés)' })
  deleteService(@CurrentUser() user: any, @Param('id') id: string) {
    return this.admin.deleteService(id, user.userId);
  }

  // ---------------- Agendas (lecture seule) ----------------
  @Get('agendas')
  listAgendas() {
    return this.admin.listAgendas();
  }

  @Get('agendas/:professionnelId')
  getAgenda(@Param('professionnelId') professionnelId: string, @Query('date') date?: string) {
    return this.admin.getAgenda(professionnelId, date);
  }

  @Get('indisponibilites')
  @ApiOperation({ summary: 'Absences et indisponibilités de tous les professionnels' })
  listIndispos(
    @Query('professionnelId') professionnelId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('type') type?: string,
  ) {
    return this.admin.listIndisponibilites({ professionnelId, from, to, type });
  }

  // ---------------- Paramètres généraux ----------------
  @Get('params')
  getParams() {
    return this.admin.getParams();
  }

  @Patch('params')
  updateParams(@CurrentUser() user: any, @Body() dto: UpdateParamsDto) {
    return this.admin.updateParams(dto, user.userId);
  }

  // ---------------- Statistiques & audit ----------------
  @Get('stats')
  stats() {
    return this.admin.statsGlobales();
  }

  @Get('audit')
  audit(
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('professionnelId') professionnelId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.admin.auditLog({ action, userId, professionnelId, from, to, take: Number(take), skip: Number(skip) });
  }

  // ---------------- Exports ----------------
  @Get('export/:entity')
  @ApiOperation({
    summary:
      'Export CSV : professionnels | receptionnistes | clients | rendez-vous | services | domaines | indisponibilites | audit. ' +
      "Les filtres passés en query reprennent ceux de la page appelante : l'export porte sur ce qui est affiché.",
  })
  async export(@Param('entity') entity: string, @Query() query: Record<string, string>, @Res() res: Response) {
    const { filename, csv } = await this.admin.exportCsv(entity, query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
