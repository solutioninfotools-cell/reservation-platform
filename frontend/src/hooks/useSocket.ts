import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * Connexion Socket.IO — met à jour les interfaces sans rechargement manuel
 * (section 22 du CDC) lorsqu'un rendez-vous est créé/modifié/annulé.
 */
export function useSocket(professionnelId: string | undefined, onEvent: (event: string, payload: any) => void) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!professionnelId) return;
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000/events');
    socketRef.current = socket;
    socket.emit('join', `pro:${professionnelId}`);

    const events = ['rdv:created', 'rdv:updated', 'rdv:status-changed'];
    events.forEach((e) => socket.on(e, (payload) => onEvent(e, payload)));

    return () => { socket.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professionnelId]);

  return socketRef;
}
