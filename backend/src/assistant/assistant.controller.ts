import { Body, Controller, ForbiddenException, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AssistantService } from './assistant.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AskDto } from './dto/ask.dto';

@ApiTags('assistant')
@Controller('assistant')
export class AssistantController {
  constructor(private assistant: AssistantService, private prisma: PrismaService) {}

  /**
   * Assistant public (espace Client, section IV.4 du CDC).
   *
   * Le `professionnelId` n'est plus accepté depuis le corps de la requête :
   * il permettait à un appelant anonyme d'énumérer les services de n'importe
   * quel professionnel. L'espace étant mono-professionnel côté public, on
   * résout ici le professionnel actif de la plateforme.
   */
  @Post('ask')
  async ask(@Body() dto: AskDto) {
    const pro = await this.prisma.professionnel.findFirst({
      where: { user: { statutCompte: 'ACTIF' } },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    return this.assistant.answer(dto.question, pro?.id);
  }

  /**
   * Assistant de l'espace Professionnel (section II.20 du CDC).
   * Le professionnel est déduit de la session : l'assistant n'accède jamais
   * qu'aux données que l'utilisateur connecté a le droit de consulter.
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PROFESSIONNEL')
  @Post('pro')
  async askPro(@CurrentUser() user: any, @Body() dto: AskDto) {
    const pro = await this.prisma.professionnel.findUnique({ where: { userId: user.userId }, select: { id: true } });
    if (!pro) throw new ForbiddenException('Compte professionnel introuvable.');
    return this.assistant.answerForProfessionnel(dto.question, pro.id);
  }
}
