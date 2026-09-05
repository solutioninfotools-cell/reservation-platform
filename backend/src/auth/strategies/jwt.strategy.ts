import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'change-me-in-.env',
    });
  }

  async validate(payload: any) {
    // Injecté dans request.user pour tous les guards/décorateurs en aval.
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
