import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConfigService } from './config.service';
import { InitialSetupDto } from './dto/initial-setup.dto';
import { ResetSupervisorDto } from './dto/reset-supervisor.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('config')
@Controller('config')
export class ConfigController {
  constructor(private config: ConfigService) {}

  @Get()
  getPublicConfig() {
    return this.config.getPublicConfig();
  }

  @Post('initial-setup')
  initialSetup(@Body() dto: InitialSetupDto) {
    return this.config.initialSetup(dto);
  }

  @ApiBearerAuth()
  // Action d'urgence : elle suspend TOUS les autres comptes actifs. Réservée au
  // superviseur (CDC I.21 et « Réinitialisation de la configuration ») — sans
  // le contrôle de rôle, n'importe quel professionnel authentifié pouvait
  // désactiver la plateforme entière.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('reset-supervisor')
  resetSupervisor(@CurrentUser() user: any, @Body() dto: ResetSupervisorDto) {
    return this.config.resetSupervisor(user.userId, dto);
  }
}
