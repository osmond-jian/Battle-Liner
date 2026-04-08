import { useEffect, useRef, useCallback, useState } from 'react';
import type { GameState } from '../types/game';
import type { PeerStatus } from '../types/multiplayer';

export type PeerMessage =
  | { type: 'INIT_STATE'; gameState: GameState; guestGoesFirst: boolean }
  | { type: 'GAME_STATE'; gameState: GameState };

interface UsePeerParams {
  isHost: boolean;
  roomCode: string;
  onMessage: (msg: PeerMessage) => void;
}

interface UsePeerReturn {
  status: PeerStatus;
  sendState: (gameState: GameState) => void;
  sendInitState: (gameState: GameState, guestGoesFirst: boolean) => void;
}

export function usePeer({ isHost, roomCode, onMessage }: UsePeerParams): UsePeerReturn {
  const [status, setStatus] = useState<PeerStatus>('idle');

  // Always-fresh refs so PeerJS event handlers never capture stale values.
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const peerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const connRef = useRef<any>(null);

  const updateStatus = useCallback((s: PeerStatus) => {
    setStatus(s);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setupConnection = useCallback((conn: any) => {
    connRef.current = conn;

    conn.on('open', () => {
      updateStatus('connected');
    });

    conn.on('data', (raw: unknown) => {
      try {
        onMessageRef.current(raw as PeerMessage);
      } catch {
        console.warn('[usePeer] malformed message', raw);
      }
    });

    conn.on('close', () => {
      connRef.current = null;
      updateStatus('disconnected');
    });

    conn.on('error', (err: unknown) => {
      console.error('[usePeer] connection error', err);
      updateStatus('error');
    });
  }, [updateStatus]);

  useEffect(() => {
    // Sentinel value — used when transport is not 'realtime'.
    if (!roomCode || roomCode === '__noop__') return;

    let destroyed = false;

    (async () => {
      // Dynamic import keeps PeerJS out of the solo-mode bundle.
      const { Peer } = await import('peerjs');
      if (destroyed) return;

      const peerId = isHost ? `battleline-${roomCode}` : undefined;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const peer = new (Peer as any)(peerId, {
        debug: import.meta.env.DEV ? 2 : 0,
      });
      peerRef.current = peer;

      peer.on('open', () => {
        if (destroyed) return;
        if (isHost) {
          updateStatus('waiting');
        } else {
          updateStatus('connecting');
          const conn = peer.connect(`battleline-${roomCode}`, { reliable: true });
          setupConnection(conn);
        }
      });

      if (isHost) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        peer.on('connection', (conn: any) => {
          if (destroyed) return;
          // Accept only the first guest; reject any further connections.
          if (connRef.current) { conn.close(); return; }
          setupConnection(conn);
        });
      }

      peer.on('error', (err: unknown) => {
        console.error('[usePeer] peer error', err);
        if (!destroyed) updateStatus('error');
      });

      peer.on('disconnected', () => {
        if (!destroyed) updateStatus('disconnected');
      });
    })();

    return () => {
      destroyed = true;
      connRef.current?.close();
      peerRef.current?.destroy();
      connRef.current = null;
      peerRef.current = null;
    };
  // roomCode and isHost are stable for the lifetime of a game session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendState = useCallback((gameState: GameState) => {
    const conn = connRef.current;
    if (!conn || conn.open === false) {
      console.warn('[usePeer] sendState: connection not open');
      return;
    }
    const msg: PeerMessage = { type: 'GAME_STATE', gameState };
    conn.send(msg);
  }, []);

  const sendInitState = useCallback((gameState: GameState, guestGoesFirst: boolean) => {
    const conn = connRef.current;
    if (!conn || conn.open === false) {
      console.warn('[usePeer] sendInitState: connection not open');
      return;
    }
    const msg: PeerMessage = { type: 'INIT_STATE', gameState, guestGoesFirst };
    conn.send(msg);
  }, []);

  return { status, sendState, sendInitState };
}
