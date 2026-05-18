import type { GameState, TurnPhase } from '../types/game';

const KEY = 'battleline-mp-session';
const TTL_MS = 25 * 60 * 1000; // 25 min (server room TTL is 30 min)

export interface MpSession {
  roomCode: string;
  isHost: boolean;
  playerId: string;
  playerName: string;
  opponentName: string;
  savedAt: number;
  /** Host perspective game state — only stored by the host. */
  gameState?: GameState;
  turnPhase?: TurnPhase;
}

export function saveMpSession(session: MpSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...session, savedAt: Date.now() }));
  } catch {
    // Storage full or unavailable — silently skip.
  }
}

export function loadMpSession(): MpSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as MpSession;
    if (Date.now() - session.savedAt > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearMpSession(): void {
  localStorage.removeItem(KEY);
}
