import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConfigService } from './config.service';
import { InitialSetupDto } from './dto/initial-setup.dto';
import { ReinitialisationTotaleDto, VersAdminDto, VersPrestataireDto } from './dto/supervision.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
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
  @UseGuards(JwtAuthGuard)
  @Get('supervision')
  getSupervision(@CurrentUser() user: any) {
    return this.config.getSupervisionState(user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('supervision/vers-prestataire')
  versPrestataire(@CurrentUser() user: any, @Body() dto: VersPrestataireDto) {
    return this.config.versPrestataire(user.userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('supervision/vers-admin')
  versAdmin(@CurrentUser() user: any, @Body() dto: VersAdminDto) {
    return this.config.versAdmin(user.userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('reinitialisation-totale')
  reinitialisationTotale(@CurrentUser() user: any, @Body() dto: ReinitialisationTotaleDto) {
    return this.config.reinitialisationTotale(user.userId, dto);
  }
}