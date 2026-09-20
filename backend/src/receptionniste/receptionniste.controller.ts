import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
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
  constructor(private rec: ReceptionnisteService) {}

  @Get('moi')
  moi(@CurrentUser() user: any) {
    return this.rec.profilComplet(user.userId);
  }

  @Get('affectations')
  affectations(@CurrentUser() user: any) {
    return this.rec.mesAffectations(user.userId);
  }

  @Get('detect-client')
  detect(@Query('telephone') telephone?: string, @Query('nom') nom?: string, @Query('dateNaissance') dateNaissance?: string) {
    return this.rec.detecterClient(telephone, nom, dateNaissance);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('peutGererRdv')
  @Post('rendez-vous')
  creerRdv(@CurrentUser() user: any, @Body() dto: CreateRdvDto) {
    return this.rec.creerRdv(user.userId, dto);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('peutConsulterAgenda')
  @Get('clients')
  clients(@CurrentUser() user: any, @Query('professionnelId') professionnelId: string, @Query('search') search?: string) {
    return this.rec.clients(user.userId, professionnelId, search);
  }
}
