import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    console.log('JWT ERROR:', err);
    console.log('JWT INFO:', info?.message);
    console.log('JWT USER:', user);

    if (err || !user) {
      throw err || new UnauthorizedException(
        info?.message || 'JWT refusé'
      );
    }

    return user;
  }
}