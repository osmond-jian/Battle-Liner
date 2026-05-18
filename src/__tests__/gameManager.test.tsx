/**
 * GameManager integration tests — socket.io transport.
 *
 * Strategy:
 * - Mock 'socket.io-client' with the same lightweight fake used in usePeer.test.ts.
 * - Mock GameBoard with a stub that returns null (avoids rendering the full UI
 *   while still exercising all of GameManager's hooks and effects).
 * - Verify that GameManager correctly relays game state over the socket:
 *     host win  → host broadcasts final state so the guest sees the defeat screen
 *     guest win → host must NOT re-broadcast (the guest is responsible for that)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { GameManager } from '../components/GameManager';
import type { MultiplayerConfig } from '../types/multiplayer';
import { makeState } from './helpers';

// ── Shared mock state ─────────────────────────────────────────────────────────

const socketState = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lastSocket: null as any,
}));

// ── Fake socket.io-client ─────────────────────────────────────────────────────

vi.mock('socket.io-client', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function makeSocket(): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlers: Record<string, any[]> = {};
    let _connected = false;

    const socket = {
      get connected() { return _connected; },
      emitted: [] as { event: string; args: unknown[] }[],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      acks: {} as Record<string, any[]>,

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      on(event: string, cb: any) { (handlers[event] ??= []).push(cb); },

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      emit(event: string, ...args: any[]) {
        const last = args[args.length - 1];
        if (typeof last === 'function') {
          (socket.acks[event] ??= []).push(last);
          socket.emitted.push({ event, args: args.slice(0, -1) });
        } else {
          socket.emitted.push({ event, args });
        }
      },

      disconnect() {
        _connected = false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (handlers['disconnect'] ?? []).forEach((cb: any) => cb('io client disconnect'));
      },

      _connect() {
        _connected = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (handlers['connect'] ?? []).forEach((cb: any) => cb());
      },
      _emit(event: string, ...args: unknown[]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (handlers[event] ?? []).forEach((cb: any) => cb(...args));
      },
      _ack(event: string, response: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cbs: any[] = socket.acks[event] ?? [];
        socket.acks[event] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cbs.forEach((cb: any) => cb(response));
      },
    };

    socketState.lastSocket = socket;
    return socket;
  }

  return { io: () => makeSocket() };
});

// ── Stub GameBoard ────────────────────────────────────────────────────────────

vi.mock('../components/GameBoard', () => ({ GameBoard: () => null }));

// ── Helpers ───────────────────────────────────────────────────────────────────

const realtimeHostConfig: MultiplayerConfig = {
  transport: 'realtime',
  isHost: true,
  roomCode: 'TESTGM',
  localPlayer: { id: 'host-uuid', username: 'Host' },
  opponentName: 'Guest',
  hostName: 'Host',
  guestName: 'Guest',
  currentTurnName: 'Host',
};

async function waitForEffects() {
  await act(async () => { await new Promise(r => setTimeout(r, 50)); });
}

/** Bring the socket to 'connected' status (connect → register ack → guest_joined). */
async function establishConnection() {
  const socket = socketState.lastSocket;
  await act(async () => { socket._connect(); });
  await act(async () => { socket._ack('register', { status: 'ok', role: 'host', guestPresent: false }); });
  await act(async () => { socket._emit('guest_joined', { guestName: 'Guest' }); });
  await waitForEffects(); // let INIT_STATE effect run
}

beforeEach(() => {
  socketState.lastSocket = null;
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GameManager — realtime multiplayer game-over broadcast', () => {
  it('broadcasts the winning state to the guest when the host wins', async () => {
    // Regression: after the winning move the DrawModal is suppressed (gated on
    // gameStatus === 'playing'), so handleDeckDraw / setPendingSend never fired
    // via the normal path — the guest never received the defeat state.
    // Fix: a dedicated useEffect sets pendingSend whenever gameStatus → 'playerWon'.

    const { unmount } = render(
      <GameManager onExit={() => {}} multiplayerConfig={realtimeHostConfig} />,
    );
    await waitForEffects();
    await establishConnection();

    // Clear the socket log so we only inspect post-win messages.
    socketState.lastSocket.emitted = [];

    // Guest sends GAME_STATE saying the opponent (host) won.
    // flipGameStatePerspective converts 'opponentWon' → 'playerWon' for the host.
    const guestViewState = { ...makeState(), gameStatus: 'opponentWon' as const };
    await act(async () => {
      socketState.lastSocket._emit('game_state', { gameState: guestViewState });
    });
    await waitForEffects();

    const broadcasts = socketState.lastSocket.emitted.filter(
      (e: { event: string }) => e.event === 'game_state',
    );
    expect(broadcasts.length).toBeGreaterThan(0);

    // The broadcasted state must carry 'playerWon' (host's perspective) so the
    // guest's onMessage flips it to 'opponentWon' and shows the defeat screen.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastBroadcast = broadcasts[broadcasts.length - 1] as any;
    expect(lastBroadcast.args[0].gameState.gameStatus).toBe('playerWon');

    unmount();
  });

  it('does NOT broadcast when the guest wins (guest is responsible for that send)', async () => {
    // When the guest wins, the guest's state transitions to 'playerWon' and the
    // guest sends the final GAME_STATE. The host's state becomes 'opponentWon'
    // and must NOT re-broadcast (that would create an echo loop).

    const { unmount } = render(
      <GameManager onExit={() => {}} multiplayerConfig={realtimeHostConfig} />,
    );
    await waitForEffects();
    await establishConnection();

    socketState.lastSocket.emitted = [];

    // Guest sends GAME_STATE saying they won. After flip: host sees 'opponentWon'.
    const guestViewState = { ...makeState(), gameStatus: 'playerWon' as const };
    await act(async () => {
      socketState.lastSocket._emit('game_state', { gameState: guestViewState });
    });
    await waitForEffects();

    const broadcasts = socketState.lastSocket.emitted.filter(
      (e: { event: string }) => e.event === 'game_state',
    );
    expect(broadcasts.length).toBe(0);

    unmount();
  });
});
