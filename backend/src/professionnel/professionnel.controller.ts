import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProfessionnelService } from './professionnel.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import { CreateDisponibiliteDto, CreateIndisponibiliteDto } from './dto/disponibilite.dto';
import { UpdatePermissionsDto } from './dto/affectation.dto';

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
    return this.pro.findByUserId(user.userId);
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
