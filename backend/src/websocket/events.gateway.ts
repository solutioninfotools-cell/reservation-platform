import { Injectable } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

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
