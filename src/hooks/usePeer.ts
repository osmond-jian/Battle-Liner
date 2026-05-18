import { useEffect, useRef, useCallback, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { GameState } from '../types/game';
import type { PeerStatus } from '../types/multiplayer';

// Re-export shape identical to old PeerJS version so GameManager/GameBoard are unchanged.
export type PeerMessage =
  | { type: 'INIT_STATE'; gameState: GameState; guestGoesFirst: boolean }
  | { type: 'GAME_STATE'; gameState: GameState }
  | { type: 'RESYNC_STATE'; gameState: GameState; isGuestTurn: boolean };

interface UsePeerParams {
  isHost: boolean;
  roomCode: string;
  /** Stable player UUID (from localStorage profile), used for room re-registration after reconnect. */
  playerId: string;
  playerName: string;
  onMessage: (msg: PeerMessage) => void;
  onGuestReconnect?: () => void;
  /** Host only: provides current game state for room recovery after server restart. */
  getGameState?: () => GameState;
  onConcede?: () => void;
  onRematchRequest?: () => void;
  onRematchAccept?: () => void;
}

interface UsePeerReturn {
  status: PeerStatus;
  hadGuest: boolean;
  retryCount: number;
  lastError: string | null;
  sendState: (gameState: GameState) => void;
  sendInitState: (gameState: GameState, guestGoesFirst: boolean) => void;
  sendResync: (gameState: GameState, isGuestTurn: boolean) => void;
  sendConcede: () => void;
  sendRematchRequest: () => void;
  sendRematchAccept: () => void;
}

export const MAX_RETRIES = 10;

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';

export function usePeer({
  isHost,
  roomCode,
  playerId,
  playerName,
  onMessage,
  onGuestReconnect,
  getGameState,
  onConcede,
  onRematchRequest,
  onRematchAccept,
}: UsePeerParams): UsePeerReturn {
  const [status, setStatus] = useState<PeerStatus>('idle');
  const [hadGuest, setHadGuest] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const destroyedRef = useRef(false);

  // Mirrors hadGuest state for synchronous reads inside event handlers.
  const hadGuestRef = useRef(false);
  // Tracks room-join retry attempts separately from socket.io transport retries.
  const roomRetryCountRef = useRef(0);
  const roomRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Always-fresh refs so event handlers never capture stale values.
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const onGuestReconnectRef = useRef(onGuestReconnect);
  onGuestReconnectRef.current = onGuestReconnect;
  const getGameStateRef = useRef(getGameState);
  getGameStateRef.current = getGameState;
  const onConcedeRef = useRef(onConcede);
  onConcedeRef.current = onConcede;
  const onRematchRequestRef = useRef(onRematchRequest);
  onRematchRequestRef.current = onRematchRequest;
  const onRematchAcceptRef = useRef(onRematchAccept);
  onRematchAcceptRef.current = onRematchAccept;

  // Attempts to register with the room after the socket is connected.
  // Called on initial connect and on every socket.io auto-reconnect.
  const registerWithRoom = useCallback((socket: Socket) => {
    if (destroyedRef.current) return;

    const gameState = isHost ? getGameStateRef.current?.() : undefined;

    type RegisterResponse =
      | { status: 'ok'; role: 'host'; guestPresent: boolean }
      | { status: 'ok'; role: 'guest' }
      | { status: 'error'; message: string };

    socket.emit(
      'register',
      { roomCode, playerId, playerName, isHost, gameState },
      (res: RegisterResponse) => {
        if (destroyedRef.current) return;

        if (res.status === 'error') {
          // Room not found — server may have restarted before host reconnected.
          // Keep retrying until host recreates the room or we give up.
          if (roomRetryCountRef.current < MAX_RETRIES) {
            roomRetryCountRef.current += 1;
            setRetryCount(roomRetryCountRef.current);
            setStatus('reconnecting');
            roomRetryTimerRef.current = setTimeout(() => registerWithRoom(socket), 3000);
          } else {
            setLastError(res.message);
            setStatus('disconnected');
          }
          return;
        }

        roomRetryCountRef.current = 0;
        setRetryCount(0);

        if (res.role === 'host') {
          if (res.guestPresent) {
            // Host reconnected while guest is still in the room — resync immediately.
            setHadGuest(true);
            hadGuestRef.current = true;
            setStatus('connected');
            onGuestReconnectRef.current?.();
          } else {
            setStatus('waiting');
          }
        } else {
          // Guest successfully joined room.
          setStatus('connected');
        }
      },
    );
  }, [isHost, roomCode, playerId, playerName]);

  useEffect(() => {
    if (!roomCode || roomCode === '__noop__') return;
    destroyedRef.current = false;

    const socket = io(SERVER_URL, {
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });
    socketRef.current = socket;
    setStatus('connecting');

    socket.on('connect', () => {
      if (destroyedRef.current) return;
      // Clear any pending room-join retries — fresh socket, fresh attempt.
      if (roomRetryTimerRef.current) {
        clearTimeout(roomRetryTimerRef.current);
        roomRetryTimerRef.current = null;
      }
      roomRetryCountRef.current = 0;
      registerWithRoom(socket);
    });

    // Host receives this when a new guest joins for the first time.
    socket.on('guest_joined', ({ guestName }: { guestName: string }) => {
      if (destroyedRef.current) return;
      const wasAlreadyHere = hadGuestRef.current;
      hadGuestRef.current = true;
      setHadGuest(true);
      setStatus('connected');
      // If the guest was previously here (e.g. full server restart), treat as rejoin.
      if (wasAlreadyHere) onGuestReconnectRef.current?.();
      else console.log('[useSocket] guest joined:', guestName);
    });

    // Opponent reconnected after a disconnect.
    socket.on('opponent_reconnected', () => {
      if (destroyedRef.current) return;
      setStatus('connected');
      // Host side: re-send authoritative state to the reconnected guest.
      if (isHost) onGuestReconnectRef.current?.();
    });

    socket.on('opponent_disconnected', () => {
      if (destroyedRef.current) return;
      // Both host and guest go to 'waiting'; GameBoard overlay shows reconnect hint.
      setStatus('waiting');
    });

    socket.on('game_state', ({ gameState }: { gameState: GameState }) => {
      if (destroyedRef.current) return;
      onMessageRef.current({ type: 'GAME_STATE', gameState });
    });

    socket.on('init_state', ({ gameState, guestGoesFirst }: { gameState: GameState; guestGoesFirst: boolean }) => {
      if (destroyedRef.current) return;
      onMessageRef.current({ type: 'INIT_STATE', gameState, guestGoesFirst });
      if (!isHost) setStatus('connected');
    });

    socket.on('resync_state', ({ gameState, isGuestTurn }: { gameState: GameState; isGuestTurn: boolean }) => {
      if (destroyedRef.current) return;
      onMessageRef.current({ type: 'RESYNC_STATE', gameState, isGuestTurn });
    });

    socket.on('concede', () => {
      if (destroyedRef.current) return;
      onConcedeRef.current?.();
    });

    socket.on('rematch_request', () => {
      if (destroyedRef.current) return;
      onRematchRequestRef.current?.();
    });

    socket.on('rematch_accept', () => {
      if (destroyedRef.current) return;
      onRematchAcceptRef.current?.();
    });

    // ── Socket.io transport events ───────────────────────────────────────────

    socket.on('disconnect', (reason) => {
      if (destroyedRef.current) return;
      console.log('[useSocket] disconnected:', reason);
      if (reason !== 'io client disconnect') setStatus('reconnecting');
    });

    // Socket.io re-established the transport — re-register with the room.
    socket.on('reconnect', () => {
      if (destroyedRef.current) return;
      console.log('[useSocket] transport reconnected, re-registering');
      registerWithRoom(socket);
    });

    socket.on('reconnect_attempt', (attempt: number) => {
      if (destroyedRef.current) return;
      setRetryCount(attempt);
    });

    socket.on('reconnect_failed', () => {
      if (destroyedRef.current) return;
      setStatus('disconnected');
      setLastError('Could not reconnect to server.');
    });

    socket.on('connect_error', (err: Error) => {
      if (destroyedRef.current) return;
      setLastError(err.message);
      // Socket.io keeps retrying; leave status as-is so the overlay message persists.
    });

    socket.on('server_shutdown', () => {
      if (destroyedRef.current) return;
      // Server is restarting (e.g. Render redeploy). Socket.io will auto-reconnect.
      setStatus('reconnecting');
    });

    return () => {
      destroyedRef.current = true;
      if (roomRetryTimerRef.current) clearTimeout(roomRetryTimerRef.current);
      socket.disconnect();
      socketRef.current = null;
    };
  // roomCode, isHost, playerId, playerName are stable for the session lifetime.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendState = useCallback((gameState: GameState) => {
    const socket = socketRef.current;
    if (!socket?.connected) { console.warn('[useSocket] sendState: not connected'); return; }
    socket.emit('game_state', { roomCode, gameState });
  }, [roomCode]);

  const sendInitState = useCallback((gameState: GameState, guestGoesFirst: boolean) => {
    const socket = socketRef.current;
    if (!socket?.connected) { console.warn('[useSocket] sendInitState: not connected'); return; }
    socket.emit('init_state', { roomCode, gameState, guestGoesFirst });
  }, [roomCode]);

  const sendResync = useCallback((gameState: GameState, isGuestTurn: boolean) => {
    const socket = socketRef.current;
    if (!socket?.connected) { console.warn('[useSocket] sendResync: not connected'); return; }
    socket.emit('resync_state', { roomCode, gameState, isGuestTurn });
  }, [roomCode]);

  const sendConcede = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) { console.warn('[useSocket] sendConcede: not connected'); return; }
    socket.emit('concede', { roomCode });
  }, [roomCode]);

  const sendRematchRequest = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) { console.warn('[useSocket] sendRematchRequest: not connected'); return; }
    socket.emit('rematch_request', { roomCode });
  }, [roomCode]);

  const sendRematchAccept = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) { console.warn('[useSocket] sendRematchAccept: not connected'); return; }
    socket.emit('rematch_accept', { roomCode });
  }, [roomCode]);

  return { status, hadGuest, retryCount, lastError, sendState, sendInitState, sendResync, sendConcede, sendRematchRequest, sendRematchAccept };
}
