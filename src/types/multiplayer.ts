export interface LocalPlayer {
  id: string;      // UUID, persisted in localStorage
  username: string;
}

/**
 * 'url-async'  — correspondence style; moves exchanged via shared URLs.
 * 'realtime'   — live play via WebSocket/PeerJS (Phase 3).
 */
export type TransportMode = 'url-async' | 'realtime';

export interface MultiplayerConfig {
  localPlayer: LocalPlayer;
  opponentName: string;
  isHost: boolean;
  transport: TransportMode;
  // URL-async fields (also useful for real-time lobby display)
  hostName: string;
  guestName: string;
  currentTurnName: string; // username of whoever plays next
}
