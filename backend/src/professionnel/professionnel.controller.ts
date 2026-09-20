import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProfessionnelService } from './professionnel.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import { CreateDisponibiliteDto, CreateIndisponibiliteDto } from './dto/disponibilite.dto';
import { UpdatePermissionsDto } from './dto/affectation.dto';
import { CreateChampDto, UpdateChampDto } from './dto/champ.dto';
import { CreateNoteDto, UpdateNoteDto } from './dto/note.dto';
import { UpdateParametresDto } from './dto/parametres.dto';

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

  @Get('moi')
  async moi(@CurrentUser() user: any) {
    return this.pro.profilComplet(user.userId);
  }

  @Patch('profil')
  updateProfil(@CurrentUser() user: any, @Body() body: any) {
    return this.pro.updateProfil(user.userId, body);
  }

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

  @Get('disponibilites')
  async listDispo(@CurrentUser() user: any) {
    const me = await this.pro.findByUserId(user.userId);
    return this.pro.listDisponibilites(me.id);
  }
  @Post('disponibilites')
  addDispo(@CurrentUser() user: any, @Body() dto: CreateDisponibiliteDto) {
    return this.pro.addDisponibilite(user.userId, dto);
  }
  @Delete('disponibilites/:id')
  removeDispo(@CurrentUser() user: any, @Param('id') id: string) {
    return this.pro.removeDisponibilite(user.userId, id);
  }

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

  // ---- Champs personnalisés par service (CDC II.6) ----
  @Get('champs')
  async listChamps(@CurrentUser() user: any, @Query('serviceId') serviceId?: string) {
    const me = await this.pro.findByUserId(user.userId);
    return this.pro.listChamps(me.id, serviceId);
  }
  @Post('champs')
  createChamp(@CurrentUser() user: any, @Body() dto: CreateChampDto) {
    return this.pro.createChamp(user.userId, dto);
  }
  @Patch('champs/:id')
  updateChamp(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateChampDto) {
    return this.pro.updateChamp(user.userId, id, dto);
  }
  @Delete('champs/:id')
  deleteChamp(@CurrentUser() user: any, @Param('id') id: string) {
    return this.pro.deleteChamp(user.userId, id);
  }

  // ---- Clients et notes internes (CDC II.9) ----
  @Get('clients')
  async listClients(@CurrentUser() user: any, @Query('search') search?: string) {
    const me = await this.pro.findByUserId(user.userId);
    return this.pro.listClients(me.id, search);
  }
  @Get('notes')
  async listNotes(@CurrentUser() user: any, @Query('clientId') clientId?: string) {
    const me = await this.pro.findByUserId(user.userId);
    return this.pro.listNotes(me.id, clientId);
  }
  @Post('notes')
  createNote(@CurrentUser() user: any, @Body() dto: CreateNoteDto) {
    return this.pro.createNote(user.userId, dto);
  }
  @Patch('notes/:id')
  updateNote(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateNoteDto) {
    return this.pro.updateNote(user.userId, id, dto);
  }
  @Delete('notes/:id')
  deleteNote(@CurrentUser() user: any, @Param('id') id: string) {
    return this.pro.deleteNote(user.userId, id);
  }

  // ---- Règles de réservation (CDC II.15bis) ----
  @Get('parametres')
  async getParametres(@CurrentUser() user: any) {
    const me = await this.pro.findByUserId(user.userId);
    return this.pro.getParametres(me.id);
  }
  @Patch('parametres')
  updateParametres(@CurrentUser() user: any, @Body() dto: UpdateParametresDto) {
    return this.pro.updateParametres(user.userId, dto);
  }

  @Get('receptionnistes')
  async listReceptionnistes(@CurrentUser() user: any) {
    const me = await this.pro.findByUserId(user.userId);
    return this.pro.listReceptionnistes(me.id);
  }
  @Patch('receptionnistes/:affectationId/permissions')
  updatePermissions(@CurrentUser() user: any, @Param('affectationId') affectationId: string, @Body() dto: UpdatePermissionsDto) {
    return this.pro.updatePermissions(user.userId, affectationId, dto);
  }

  @Get('stats')
  async stats(@CurrentUser() user: any) {
    const me = await this.pro.findByUserId(user.userId);
    return this.pro.stats(me.id);
  }
}
