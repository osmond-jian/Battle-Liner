export interface LocalPlayer {
  id: string;      // UUID, persisted in localStorage
  username: string;
}

/**
 * 'url-async'  — correspondence style; moves exchanged via shared URLs (legacy).
 * 'realtime'   — live play via WebRTC DataChannel (PeerJS).
 */
export type TransportMode = 'url-async' | 'realtime';

export interface MultiplayerConfig {
  localPlayer: LocalPlayer;
  opponentName: string;
  isHost: boolean;
  transport: TransportMode;
  hostName: string;
  guestName: string;
  currentTurnName: string; // username of whoever plays next
  roomCode?: string;       // present when transport === 'realtime'
}

export type PeerStatus =
  | 'idle'
  | 'waiting'       // host: peer open, listening for guest
  | 'connecting'    // guest: initial connection attempt in progress
  | 'reconnecting'  // guest: connection lost, retrying
  | 'connected'
  | 'disconnected'
  | 'error';
