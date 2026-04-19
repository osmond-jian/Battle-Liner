import { useEffect, useRef, useCallback, useState } from 'react';
import type { GameState } from '../types/game';
import type { PeerStatus } from '../types/multiplayer';

export type PeerMessage =
  | { type: 'INIT_STATE'; gameState: GameState; guestGoesFirst: boolean }
  | { type: 'GAME_STATE'; gameState: GameState }
  | { type: 'RESYNC_STATE'; gameState: GameState; isGuestTurn: boolean };

interface UsePeerParams {
  isHost: boolean;
  roomCode: string;
  onMessage: (msg: PeerMessage) => void;
  /** Host only: called when a guest reconnects after a disconnection. */
  onGuestReconnect?: () => void;
}

interface UsePeerReturn {
  status: PeerStatus;
  /** True once the host has had at least one guest connection (used for
   *  'waiting' UI: show reconnect hint instead of initial room-code prompt). */
  hadGuest: boolean;
  sendState: (gameState: GameState) => void;
  sendInitState: (gameState: GameState, guestGoesFirst: boolean) => void;
  sendResync: (gameState: GameState, isGuestTurn: boolean) => void;
}

/** Max number of automatic reconnection attempts the guest will make. */
const MAX_RETRIES = 10;

export function usePeer({ isHost, roomCode, onMessage, onGuestReconnect }: UsePeerParams): UsePeerReturn {
  const [status, setStatus] = useState<PeerStatus>('idle');

  // Always-fresh refs so PeerJS event handlers never capture stale values.
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const onGuestReconnectRef = useRef(onGuestReconnect);
  onGuestReconnectRef.current = onGuestReconnect;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const peerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const connRef = useRef<any>(null);

  // Tracks cleanup so async callbacks don't run after unmount.
  const destroyedRef = useRef(false);

  // Tracks whether the host has ever had a successful connection (used to
  // distinguish the initial guest connection from a later reconnection).
  const didHaveConnectionRef = useRef(false);
  const [hadGuest, setHadGuest] = useState(false);

  // Timer handle for the guest's reconnect backoff.
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateStatus = useCallback((s: PeerStatus) => {
    setStatus(s);
  }, []);

  /**
   * Wires up a DataConnection's event handlers.
   * `onConnLost` is called exactly once when the connection closes or errors.
   * Setting connRef.current happens here so it's cleared before onConnLost fires.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setupConnection = useCallback((conn: any, onConnLost: () => void, onOpen?: () => void) => {
    connRef.current = conn;

    // Guard so close + error don't both fire onConnLost.
    let lost = false;
    const notifyLost = () => {
      if (lost || destroyedRef.current) return;
      lost = true;
      connRef.current = null;
      onConnLost();
    };

    conn.on('open', () => {
      if (destroyedRef.current) return;
      updateStatus('connected');
      // Called after the channel is confirmed open so any immediate sends succeed.
      onOpen?.();
    });

    conn.on('data', (raw: unknown) => {
      try {
        onMessageRef.current(raw as PeerMessage);
      } catch {
        console.warn('[usePeer] malformed message', raw);
      }
    });

    conn.on('close', notifyLost);

    conn.on('error', (err: unknown) => {
      console.error('[usePeer] connection error', err);
      notifyLost();
    });
  }, [updateStatus]);

  useEffect(() => {
    // Sentinel value — used when transport is not 'realtime'.
    if (!roomCode || roomCode === '__noop__') return;

    destroyedRef.current = false;

    (async () => {
      // Dynamic import keeps PeerJS out of the solo-mode bundle.
      const { Peer } = await import('peerjs');
      if (destroyedRef.current) return;

      const peerId = isHost ? `battleline-${roomCode}` : undefined;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const peer = new (Peer as any)(peerId, {
        debug: import.meta.env.DEV ? 2 : 0,
      });
      peerRef.current = peer;

      // ── Guest: attempt connection with automatic retry on failure ──────────
      const attemptConnect = (retryCount: number) => {
        if (destroyedRef.current) return;
        const conn = peer.connect(`battleline-${roomCode}`, { reliable: true });
        setupConnection(conn, () => {
          if (destroyedRef.current) return;
          if (retryCount < MAX_RETRIES) {
            updateStatus('reconnecting');
            retryTimerRef.current = setTimeout(
              () => attemptConnect(retryCount + 1),
              3000,
            );
          } else {
            updateStatus('disconnected');
          }
        });
      };

      peer.on('open', () => {
        if (destroyedRef.current) return;
        if (isHost) {
          updateStatus('waiting');
        } else {
          updateStatus('connecting');
          attemptConnect(0);
        }
      });

      // ── Host: accept incoming connections; re-accept after disconnect ──────
      if (isHost) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        peer.on('connection', (conn: any) => {
          if (destroyedRef.current) return;
          // Reject while a connection is already active (prevents a third party
          // from joining while the game is in progress).
          if (connRef.current) { conn.close(); return; }

          const isReconnect = didHaveConnectionRef.current;
          didHaveConnectionRef.current = true;
          setHadGuest(true);

          setupConnection(
            conn,
            // On disconnect: go back to waiting so the same guest can reconnect.
            () => { if (!destroyedRef.current) updateStatus('waiting'); },
            // On open: if this is a reconnect, notify GameManager to send RESYNC_STATE.
            // Must fire AFTER the channel is open so sendResync's conn.open check passes.
            isReconnect ? () => onGuestReconnectRef.current?.() : undefined,
          );
        });
      }

      peer.on('error', (err: unknown) => {
        console.error('[usePeer] peer error', err);
        if (!destroyedRef.current) updateStatus('error');
      });

      peer.on('disconnected', () => {
        if (!destroyedRef.current) updateStatus('disconnected');
      });
    })();

    return () => {
      destroyedRef.current = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
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

  const sendResync = useCallback((gameState: GameState, isGuestTurn: boolean) => {
    const conn = connRef.current;
    if (!conn || conn.open === false) {
      console.warn('[usePeer] sendResync: connection not open');
      return;
    }
    const msg: PeerMessage = { type: 'RESYNC_STATE', gameState, isGuestTurn };
    conn.send(msg);
  }, []);

  return { status, hadGuest, sendState, sendInitState, sendResync };
}
