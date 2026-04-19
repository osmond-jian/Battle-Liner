/**
 * GameManager integration tests.
 *
 * Scope: verifies that GameManager correctly broadcasts game state over the
 * peer connection in realtime-multiplayer scenarios.
 *
 * Strategy:
 *   - Mock 'peerjs' with the same lightweight fake used in usePeer.test.ts.
 *   - Mock GameBoard with a stub that returns null (avoids rendering the full
 *     UI with its many dependencies while still exercising all of GameManager's
 *     hooks and effects).
 *   - Trigger a game-over condition by having the fake connection emit a
 *     GAME_STATE data event whose gameStatus indicates the host won (from the
 *     guest's perspective: 'opponentWon' → flipped to 'playerWon' on the host).
 *   - Assert on `conn.sent` to verify the correct P2P messages were sent.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { GameManager } from '../components/GameManager';
import type { MultiplayerConfig } from '../types/multiplayer';
import { makeState } from './helpers';

// ── vi.hoisted: shared mutable state ─────────────────────────────────────────

const peerState = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lastPeer: null as any,
}));

// ── Fake PeerJS module ────────────────────────────────────────────────────────

vi.mock('peerjs', () => {
  class FakePeer {
    id: string;
    destroyed = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _h: Record<string, any[]> = {};

    constructor(id?: string) {
      this.id = id ?? 'auto-id';
      peerState.lastPeer = this;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string, cb: any) { (this._h[event] ??= []).push(cb); }
    connect() {
      return { open: false, on() {}, send() {}, close() {}, _emit() {} };
    }
    destroy() { this.destroyed = true; }
    _emit(event: string, ...args: unknown[]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this._h[event]?.forEach((cb: any) => cb(...args));
    }
  }

  return { Peer: FakePeer };
});

// ── Stub GameBoard ────────────────────────────────────────────────────────────
// Returns null so the heavy UI tree (framer-motion, drag-and-drop, etc.) is
// never mounted, but GameManager's own hooks and effects still run in full.

vi.mock('../components/GameBoard', () => ({ GameBoard: () => null }));

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * A fake connection with a proper event-handler registry.
 * - Auto-fires 'open' when `on('open', cb)` is registered (simulates an
 *   already-open channel, matching the host's view of an accepted connection).
 * - `_emit(event, ...args)` lets tests inject 'data' events (simulate the
 *   guest sending a P2P message) or 'close' events.
 */
function makeConn() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlers: Record<string, any[]> = {};
  return {
    open: true,
    sent: [] as unknown[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string, cb: any) {
      (handlers[event] ??= []).push(cb);
      if (event === 'open') cb(); // auto-open
    },
    send(msg: unknown) { this.sent.push(msg); },
    close() { handlers['close']?.forEach((cb: () => void) => cb()); },
    _emit(event: string, ...args: unknown[]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handlers[event]?.forEach((cb: any) => cb(...args));
    },
  };
}

const realtimeHostConfig: MultiplayerConfig = {
  transport: 'realtime',
  isHost: true,
  roomCode: 'TESTGM',
  localPlayer: { username: 'Host' },
  opponentName: 'Guest',
};

/** Wait long enough for the dynamic PeerJS import + async useEffect to run. */
async function waitForInit() {
  await act(async () => { await new Promise(r => setTimeout(r, 50)); });
}

beforeEach(() => {
  peerState.lastPeer = null;
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GameManager — realtime multiplayer game-over broadcast', () => {
  it('sends the winning game state to the guest when the host wins', async () => {
    // Bug being tested: after the winning move the DrawModal is suppressed
    // (gated on gameStatus === 'playing'), so handleDeckDraw / setPendingSend
    // never fire via the normal path — the guest never received the defeat state.
    //
    // The fix adds a dedicated useEffect that sets pendingSend whenever
    // gameStatus transitions to 'playerWon'.

    const conn = makeConn();
    const { unmount } = render(
      <GameManager onExit={() => {}} multiplayerConfig={realtimeHostConfig} />,
    );
    await waitForInit();

    // Open peer (host enters 'waiting').
    await act(async () => { peerState.lastPeer._emit('open'); });
    // Guest connects — host auto-sends INIT_STATE.
    await act(async () => { peerState.lastPeer._emit('connection', conn); });
    await waitForInit();

    // Reset sent log so we only assert on the game-over broadcast.
    conn.sent = [];

    // Simulate the guest sending a GAME_STATE where, from the guest's
    // perspective, the opponent (host) won → gameStatus: 'opponentWon'.
    // GameManager.onMessage flips perspective, giving the host gameStatus: 'playerWon'.
    const guestViewState = { ...makeState(), gameStatus: 'opponentWon' as const };
    await act(async () => {
      conn._emit('data', { type: 'GAME_STATE', gameState: guestViewState });
    });
    await waitForInit(); // let pendingSend effects settle

    // The host must have broadcast at least one GAME_STATE after winning.
    const gameStateMsgs = conn.sent.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (m: any) => m.type === 'GAME_STATE',
    );
    expect(gameStateMsgs.length).toBeGreaterThan(0);

    // The broadcasted state carries 'playerWon' so the guest's onMessage flips it
    // to 'opponentWon' and shows the defeat screen.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastMsg = gameStateMsgs[gameStateMsgs.length - 1] as any;
    expect(lastMsg.gameState.gameStatus).toBe('playerWon');

    unmount();
  });

  it('does NOT send a game-over broadcast when the opponent wins (guest is responsible)', async () => {
    // When the guest wins, the guest is the one whose state transitions to
    // 'playerWon' and triggers the broadcast.  The host's state becomes
    // 'opponentWon' — it must NOT re-broadcast (that would create an echo).

    const conn = makeConn();
    const { unmount } = render(
      <GameManager onExit={() => {}} multiplayerConfig={realtimeHostConfig} />,
    );
    await waitForInit();

    await act(async () => { peerState.lastPeer._emit('open'); });
    await act(async () => { peerState.lastPeer._emit('connection', conn); });
    await waitForInit();

    conn.sent = [];

    // Simulate the guest sending a GAME_STATE where, from the guest's
    // perspective, they themselves won → gameStatus: 'playerWon'.
    // After flipGameStatePerspective the host sees gameStatus: 'opponentWon'.
    const guestViewState = { ...makeState(), gameStatus: 'playerWon' as const };
    await act(async () => {
      conn._emit('data', { type: 'GAME_STATE', gameState: guestViewState });
    });
    await waitForInit();

    // Host must NOT re-broadcast in this case.
    const gameStateMsgs = conn.sent.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (m: any) => m.type === 'GAME_STATE',
    );
    expect(gameStateMsgs.length).toBe(0);

    unmount();
  });
});
