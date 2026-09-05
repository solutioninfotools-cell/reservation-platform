import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';

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

  @Get('professionnels')
  listPros(@Query('statut') statut?: string) {
    return this.admin.listProfessionnels(statut);
  }
  @Get('receptionnistes')
  listRecs(@Query('statut') statut?: string) {
    return this.admin.listReceptionnistes(statut);
  }
  @Patch('comptes/:userId/statut')
  setStatut(@CurrentUser() user: any, @Param('userId') userId: string, @Body('statut') statut: 'ACTIF' | 'REFUSE' | 'DESACTIVE') {
    return this.admin.setStatutCompte(userId, statut, user.userId);
  }

  @Post('affectations')
  affecter(@CurrentUser() user: any, @Body('professionnelId') professionnelId: string, @Body('receptionnisteId') receptionnisteId: string) {
    return this.admin.affecter(professionnelId, receptionnisteId, user.userId);
  }

  @Get('params')
  getParams() {
    return this.admin.getParams();
  }
  @Patch('params')
  updateParams(@CurrentUser() user: any, @Body() body: any) {
    return this.admin.updateParams(body, user.userId);
  }

  @Get('stats')
  stats() {
    return this.admin.statsGlobales();
  }

  @Get('audit')
  audit(@Query('action') action?: string) {
    return this.admin.auditLog(action);
  }
}
