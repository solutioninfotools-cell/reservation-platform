import { Injectable, Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Gateway Socket.IO — diffuse les événements temps réel (section 22 du CDC).
 * Les clients (frontends Admin/Pro/Réceptionniste) rejoignent une "room" nommée
 * par leur professionnelId (ou "admin" pour l'espace Admin) pour ne recevoir
 * que les événements qui les concernent.
 */
@Injectable()
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/events' })
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('EventsGateway');

  constructor(private jwt: JwtService, private prisma: PrismaService) {}

  /**
   * Adhésion à une room.
   *
   * Le gateway émettait vers `pro:<id>` et `admin`, mais aucun handler ne
   * faisait entrer les sockets dans ces rooms : les événements n'atteignaient
   * personne. L'adhésion est ici authentifiée par le JWT et vérifiée en base —
   * sans quoi n'importe qui pourrait écouter l'agenda d'un professionnel.
   */
  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { token?: string; professionnelId?: string } | string,
  ) {
    const payload = typeof data === 'string' ? { token: undefined, professionnelId: data } : (data ?? {});
    const token = payload.token ?? (client.handshake.auth as any)?.token;
    if (!token) return { ok: false, error: 'Authentification requise.' };

    let user: { sub?: string; role?: string };
    try {
      user = await this.jwt.verifyAsync(token);
    } catch {
      return { ok: false, error: 'Jeton invalide.' };
    }
    if (!user?.sub) return { ok: false, error: 'Jeton invalide.' };

    if (user.role === 'ADMIN') {
      await client.join('admin');
      return { ok: true, rooms: ['admin'] };
    }

    // On ne rejoint que les agendas auxquels le compte a réellement accès.
    const rooms: string[] = [];
    if (user.role === 'PROFESSIONNEL') {
      const pro = await this.prisma.professionnel.findUnique({ where: { userId: user.sub }, select: { id: true } });
      if (pro) rooms.push(`pro:${pro.id}`);
    } else if (user.role === 'RECEPTIONNISTE') {
      const rec = await this.prisma.receptionniste.findUnique({ where: { userId: user.sub }, select: { id: true } });
      if (rec) {
        const affectations = await this.prisma.affectation.findMany({
          where: { receptionnisteId: rec.id, actif: true, peutConsulterAgenda: true },
          select: { professionnelId: true },
        });
        rooms.push(...affectations.map((a) => `pro:${a.professionnelId}`));
      }
    }

    if (!rooms.length) return { ok: false, error: 'Aucun agenda accessible.' };
    for (const r of rooms) await client.join(r);
    this.logger.debug(`Socket ${client.id} a rejoint : ${rooms.join(', ')}`);
    return { ok: true, rooms };
  }

  emitToProfessionnel(professionnelId: string, event: string, payload: any) {
    this.server?.to(`pro:${professionnelId}`).emit(event, payload);
  }

  emitToAdmin(event: string, payload: any) {
    this.server?.to('admin').emit(event, payload);
  }

  rdvCreated(professionnelId: string, rdv: any) {
    this.emitToProfessionnel(professionnelId, 'rdv:created', rdv);
    this.emitToAdmin('rdv:created', rdv);
  }
  rdvUpdated(professionnelId: string, rdv: any) {
    this.emitToProfessionnel(professionnelId, 'rdv:updated', rdv);
    this.emitToAdmin('rdv:updated', rdv);
  }
  rdvStatusChanged(professionnelId: string, rdv: any) {
    this.emitToProfessionnel(professionnelId, 'rdv:status-changed', rdv);
    this.emitToAdmin('rdv:status-changed', rdv);
  }
}
