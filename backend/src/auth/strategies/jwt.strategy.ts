import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Même source que la signature (cf. commentaire dans auth.module.ts).
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Le rôle et le statut ne sont JAMAIS repris tels quels depuis le token :
   * ils sont relus en base à chaque requête. Sans cela, un compte désactivé ou
   * refusé par l'Admin conserverait son accès jusqu'à l'expiration du JWT (8 h),
   * et un changement de rôle ne serait pas pris en compte.
   * Enchaînement exigé par le CDC : connecté ? → compte existant ? → compte actif ?
   */
  async validate(payload: any) {
    if (!payload?.sub) throw new UnauthorizedException('Token invalide.');

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, statutCompte: true, emailVerifie: true },
    });

    if (!user) throw new UnauthorizedException('Compte introuvable.');
    if (user.statutCompte !== 'ACTIF') {
      throw new UnauthorizedException("Votre compte n'est plus actif.");
    }

    // Injecté dans request.user pour tous les guards/décorateurs en aval.
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      statutCompte: user.statutCompte,
      emailVerifie: user.emailVerifie,
    };
  }
}
