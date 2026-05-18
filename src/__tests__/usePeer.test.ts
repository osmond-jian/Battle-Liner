/**
 * usePeer hook tests (socket.io transport).
 *
 * Strategy:
 * - Mock 'socket.io-client' with a lightweight fake Socket that exposes
 *   _connect(), _emit(), and _ack() helpers for test control.
 * - Use renderHook + act to drive state transitions.
 * - NOT tested here: real network, socket.io internals, TURN traversal.
 *   These are covered by manual integration testing in two browser tabs.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePeer, MAX_RETRIES, type PeerMessage } from '../hooks/usePeer';
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      emitted: [] as { event: string; args: any[] }[],
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

      // Test helpers — never called by the hook directly.
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

// ── Shared helpers ────────────────────────────────────────────────────────────

const BASE = { playerId: 'p1', playerName: 'Alice' } as const;

beforeEach(() => {
  socketState.lastSocket = null;
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

async function wait(ms = 30) {
  await act(async () => { await new Promise(r => setTimeout(r, ms)); });
}

/** Simulate socket connecting and optionally immediately resolve the register ack. */
async function connectSocket(socket: ReturnType<typeof socketState.lastSocket>, ack?: unknown) {
  await act(async () => { socket._connect(); });
  if (ack !== undefined) {
    await act(async () => { socket._ack('register', ack); });
  }
}

// ── No-op sentinel ────────────────────────────────────────────────────────────

describe('usePeer — no-op sentinel', () => {
  it('stays idle and never creates a socket when roomCode is __noop__', async () => {
    const { result } = renderHook(() =>
      usePeer({ ...BASE, isHost: false, roomCode: '__noop__', onMessage: vi.fn() }),
    );
    await wait();
    expect(result.current.status).toBe('idle');
    expect(socketState.lastSocket).toBeNull();
  });

  it('stays idle when roomCode is empty string', async () => {
    const { result } = renderHook(() =>
      usePeer({ ...BASE, isHost: false, roomCode: '', onMessage: vi.fn() }),
    );
    await wait();
    expect(result.current.status).toBe('idle');
    expect(socketState.lastSocket).toBeNull();
  });
});

// ── Connection lifecycle ──────────────────────────────────────────────────────

describe('usePeer — connection lifecycle', () => {
  it('creates a socket and transitions to connecting on mount', async () => {
    const { result } = renderHook(() =>
      usePeer({ ...BASE, isHost: false, roomCode: 'ABCDEF', onMessage: vi.fn() }),
    );
    await wait();
    expect(socketState.lastSocket).not.toBeNull();
    expect(result.current.status).toBe('connecting');
  });

  it('emits register to the server after the socket connects', async () => {
    renderHook(() =>
      usePeer({ ...BASE, isHost: true, roomCode: 'ABCDEF', onMessage: vi.fn() }),
    );
    await wait();
    const socket = socketState.lastSocket;
    await act(async () => { socket._connect(); });
    expect(socket.emitted.some((e: { event: string }) => e.event === 'register')).toBe(true);
    expect(socket.acks['register']?.length).toBeGreaterThan(0);
  });

  it('disconnects the socket on unmount', async () => {
    const { unmount } = renderHook(() =>
      usePeer({ ...BASE, isHost: false, roomCode: 'ABCDEF', onMessage: vi.fn() }),
    );
    await wait();
    const socket = socketState.lastSocket;
    unmount();
    expect(socket.connected).toBe(false);
  });
});

// ── Host path ─────────────────────────────────────────────────────────────────

describe('usePeer — host', () => {
  it('transitions to waiting after successful registration with no guest present', async () => {
    const { result } = renderHook(() =>
      usePeer({ ...BASE, isHost: true, roomCode: 'ABCDEF', onMessage: vi.fn() }),
    );
    await wait();
    await connectSocket(socketState.lastSocket, { status: 'ok', role: 'host', guestPresent: false });
    expect(result.current.status).toBe('waiting');
  });

  it('transitions to connected immediately when registering with guest already in room', async () => {
    const onGuestReconnect = vi.fn();
    const { result } = renderHook(() =>
      usePeer({ ...BASE, isHost: true, roomCode: 'ABCDEF', onMessage: vi.fn(), onGuestReconnect }),
    );
    await wait();
    await connectSocket(socketState.lastSocket, { status: 'ok', role: 'host', guestPresent: true });
    expect(result.current.status).toBe('connected');
    expect(result.current.hadGuest).toBe(true);
    expect(onGuestReconnect).toHaveBeenCalledOnce();
  });

  it('transitions to connected when guest_joined fires', async () => {
    const { result } = renderHook(() =>
      usePeer({ ...BASE, isHost: true, roomCode: 'ABCDEF', onMessage: vi.fn() }),
    );
    await wait();
    await connectSocket(socketState.lastSocket, { status: 'ok', role: 'host', guestPresent: false });
    await act(async () => { socketState.lastSocket._emit('guest_joined', { guestName: 'Bob' }); });
    expect(result.current.status).toBe('connected');
    expect(result.current.hadGuest).toBe(true);
  });

  it('does NOT call onGuestReconnect on the first guest_joined', async () => {
    const onGuestReconnect = vi.fn();
    renderHook(() =>
      usePeer({ ...BASE, isHost: true, roomCode: 'ABCDEF', onMessage: vi.fn(), onGuestReconnect }),
    );
    await wait();
    await connectSocket(socketState.lastSocket, { status: 'ok', role: 'host', guestPresent: false });
    await act(async () => { socketState.lastSocket._emit('guest_joined', { guestName: 'Bob' }); });
    expect(onGuestReconnect).not.toHaveBeenCalled();
  });

  it('calls onGuestReconnect on a second guest_joined (guest reconnect scenario)', async () => {
    const onGuestReconnect = vi.fn();
    renderHook(() =>
      usePeer({ ...BASE, isHost: true, roomCode: 'ABCDEF', onMessage: vi.fn(), onGuestReconnect }),
    );
    await wait();
    await connectSocket(socketState.lastSocket, { status: 'ok', role: 'host', guestPresent: false });
    await act(async () => { socketState.lastSocket._emit('guest_joined', { guestName: 'Bob' }); });
    expect(onGuestReconnect).not.toHaveBeenCalled();

    await act(async () => { socketState.lastSocket._emit('guest_joined', { guestName: 'Bob' }); });
    expect(onGuestReconnect).toHaveBeenCalledOnce();
  });

  it('goes to waiting on opponent_disconnected', async () => {
    const { result } = renderHook(() =>
      usePeer({ ...BASE, isHost: true, roomCode: 'ABCDEF', onMessage: vi.fn() }),
    );
    await wait();
    await connectSocket(socketState.lastSocket, { status: 'ok', role: 'host', guestPresent: false });
    await act(async () => { socketState.lastSocket._emit('guest_joined', { guestName: 'Bob' }); });
    await act(async () => { socketState.lastSocket._emit('opponent_disconnected'); });
    expect(result.current.status).toBe('waiting');
  });

  it('returns to connected and calls onGuestReconnect on opponent_reconnected', async () => {
    const onGuestReconnect = vi.fn();
    const { result } = renderHook(() =>
      usePeer({ ...BASE, isHost: true, roomCode: 'ABCDEF', onMessage: vi.fn(), onGuestReconnect }),
    );
    await wait();
    await connectSocket(socketState.lastSocket, { status: 'ok', role: 'host', guestPresent: false });
    await act(async () => { socketState.lastSocket._emit('guest_joined', { guestName: 'Bob' }); });
    await act(async () => { socketState.lastSocket._emit('opponent_disconnected'); });
    await act(async () => { socketState.lastSocket._emit('opponent_reconnected'); });
    expect(result.current.status).toBe('connected');
    expect(onGuestReconnect).toHaveBeenCalledOnce();
  });

  it('includes current gameState in the register payload when getGameState is provided', async () => {
    const gs = makeState();
    renderHook(() =>
      usePeer({ ...BASE, isHost: true, roomCode: 'ABCDEF', onMessage: vi.fn(), getGameState: () => gs }),
    );
    await wait();
    await act(async () => { socketState.lastSocket._connect(); });
    const regEmit = socketState.lastSocket.emitted.find((e: { event: string }) => e.event === 'register');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((regEmit?.args[0] as any)?.gameState).toBe(gs);
  });

  it('hadGuest starts false and only becomes true after a guest joins', async () => {
    const { result } = renderHook(() =>
      usePeer({ ...BASE, isHost: true, roomCode: 'ABCDEF', onMessage: vi.fn() }),
    );
    await wait();
    expect(result.current.hadGuest).toBe(false);
    await connectSocket(socketState.lastSocket, { status: 'ok', role: 'host', guestPresent: false });
    expect(result.current.hadGuest).toBe(false);
    await act(async () => { socketState.lastSocket._emit('guest_joined', { guestName: 'Bob' }); });
    expect(result.current.hadGuest).toBe(true);
  });

  it('sendState emits game_state with roomCode and gameState', async () => {
    const { result } = renderHook(() =>
      usePeer({ ...BASE, isHost: true, roomCode: 'ROOM01', onMessage: vi.fn() }),
    );
    await wait();
    await connectSocket(socketState.lastSocket, { status: 'ok', role: 'host', guestPresent: false });
    await act(async () => { socketState.lastSocket._emit('guest_joined', { guestName: 'Bob' }); });

    const gs = makeState();
    act(() => { result.current.sendState(gs); });
    const sent = socketState.lastSocket.emitted.find((e: { event: string }) => e.event === 'game_state');
    expect(sent?.args[0]).toEqual({ roomCode: 'ROOM01', gameState: gs });
  });

  it('sendInitState emits init_state with roomCode, gameState, guestGoesFirst', async () => {
    const { result } = renderHook(() =>
      usePeer({ ...BASE, isHost: true, roomCode: 'ROOM01', onMessage: vi.fn() }),
    );
    await wait();
    await connectSocket(socketState.lastSocket, { status: 'ok', role: 'host', guestPresent: false });
    await act(async () => { socketState.lastSocket._emit('guest_joined', { guestName: 'Bob' }); });

    const gs = makeState();
    act(() => { result.current.sendInitState(gs, true); });
    const sent = socketState.lastSocket.emitted.find((e: { event: string }) => e.event === 'init_state');
    expect(sent?.args[0]).toEqual({ roomCode: 'ROOM01', gameState: gs, guestGoesFirst: true });
  });

  it('sendResync emits resync_state with roomCode, gameState, isGuestTurn', async () => {
    const { result } = renderHook(() =>
      usePeer({ ...BASE, isHost: true, roomCode: 'ROOM01', onMessage: vi.fn() }),
    );
    await wait();
    await connectSocket(socketState.lastSocket, { status: 'ok', role: 'host', guestPresent: false });
    await act(async () => { socketState.lastSocket._emit('guest_joined', { guestName: 'Bob' }); });

    const gs = makeState();
    act(() => { result.current.sendResync(gs, true); });
    const sent = socketState.lastSocket.emitted.find((e: { event: string }) => e.event === 'resync_state');
    expect(sent?.args[0]).toEqual({ roomCode: 'ROOM01', gameState: gs, isGuestTurn: true });
  });

  it('warns but does not throw when sendState is called before connected', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() =>
      usePeer({ ...BASE, isHost: true, roomCode: 'ABCDEF', onMessage: vi.fn() }),
    );
    await wait();
    act(() => { result.current.sendState(makeState()); });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

// ── Guest path ────────────────────────────────────────────────────────────────

describe('usePeer — guest', () => {
  it('transitions to connected after successful registration', async () => {
    const { result } = renderHook(() =>
      usePeer({ ...BASE, isHost: false, roomCode: 'ABCDEF', onMessage: vi.fn() }),
    );
    await wait();
    await connectSocket(socketState.lastSocket, { status: 'ok', role: 'guest' });
    expect(result.current.status).toBe('connected');
  });

  it('transitions to reconnecting and increments retryCount on register error', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result } = renderHook(() =>
      usePeer({ ...BASE, isHost: false, roomCode: 'ABCDEF', onMessage: vi.fn() }),
    );
    await wait();
    await act(async () => { socketState.lastSocket._connect(); });
    await act(async () => {
      socketState.lastSocket._ack('register', { status: 'error', message: 'Room not found.' });
    });
    expect(result.current.status).toBe('reconnecting');
    expect(result.current.retryCount).toBe(1);
  });

  it('re-emits register after the 3-second retry delay on error', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderHook(() =>
      usePeer({ ...BASE, isHost: false, roomCode: 'ABCDEF', onMessage: vi.fn() }),
    );
    await wait();
    await act(async () => { socketState.lastSocket._connect(); });
    const registersBefore = socketState.lastSocket.emitted.filter(
      (e: { event: string }) => e.event === 'register',
    ).length;

    await act(async () => {
      socketState.lastSocket._ack('register', { status: 'error', message: 'Room not found.' });
    });
    await act(async () => { vi.advanceTimersByTime(3100); });

    const registersAfter = socketState.lastSocket.emitted.filter(
      (e: { event: string }) => e.event === 'register',
    ).length;
    expect(registersAfter).toBe(registersBefore + 1);
  });

  it('sets status to disconnected and records lastError after MAX_RETRIES failures', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result } = renderHook(() =>
      usePeer({ ...BASE, isHost: false, roomCode: 'ABCDEF', onMessage: vi.fn() }),
    );
    await wait();
    await act(async () => { socketState.lastSocket._connect(); });

    const errorMsg = 'Room not found.';
    for (let i = 0; i <= MAX_RETRIES; i++) {
      await act(async () => {
        socketState.lastSocket._ack('register', { status: 'error', message: errorMsg });
      });
      if (i < MAX_RETRIES) {
        await act(async () => { vi.advanceTimersByTime(3100); });
      }
    }

    expect(result.current.status).toBe('disconnected');
    expect(result.current.lastError).toBe(errorMsg);
  });
});

// ── Received messages ─────────────────────────────────────────────────────────

describe('usePeer — received messages', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function makeConnectedGuest(): Promise<{ onMessage: ReturnType<typeof vi.fn>; socket: any }> {
    const onMessage = vi.fn();
    renderHook(() =>
      usePeer({ ...BASE, isHost: false, roomCode: 'ABCDEF', onMessage }),
    );
    await wait();
    await connectSocket(socketState.lastSocket, { status: 'ok', role: 'guest' });
    return { onMessage, socket: socketState.lastSocket };
  }

  it('calls onMessage with GAME_STATE on game_state event', async () => {
    const { onMessage, socket } = await makeConnectedGuest();
    const gs = makeState();
    await act(async () => { socket._emit('game_state', { gameState: gs }); });
    expect(onMessage).toHaveBeenCalledWith({ type: 'GAME_STATE', gameState: gs });
  });

  it('calls onMessage with INIT_STATE on init_state event', async () => {
    const { onMessage, socket } = await makeConnectedGuest();
    const gs = makeState();
    await act(async () => { socket._emit('init_state', { gameState: gs, guestGoesFirst: true }); });
    expect(onMessage).toHaveBeenCalledWith({ type: 'INIT_STATE', gameState: gs, guestGoesFirst: true });
  });

  it('calls onMessage with RESYNC_STATE on resync_state event', async () => {
    const { onMessage, socket } = await makeConnectedGuest();
    const gs = makeState();
    await act(async () => { socket._emit('resync_state', { gameState: gs, isGuestTurn: false }); });
    expect(onMessage).toHaveBeenCalledWith({ type: 'RESYNC_STATE', gameState: gs, isGuestTurn: false });
  });

  it('calls onMessage with correct INIT_STATE shape when guestGoesFirst is false', async () => {
    const { onMessage, socket } = await makeConnectedGuest();
    const gs = makeState();
    await act(async () => { socket._emit('init_state', { gameState: gs, guestGoesFirst: false }); });
    const msg = onMessage.mock.calls[0][0] as PeerMessage;
    expect(msg.type).toBe('INIT_STATE');
    if (msg.type === 'INIT_STATE') expect(msg.guestGoesFirst).toBe(false);
  });
});

// ── Transport-level reconnect events ─────────────────────────────────────────

describe('usePeer — transport reconnect', () => {
  it('transitions to reconnecting on non-intentional disconnect', async () => {
    const { result } = renderHook(() =>
      usePeer({ ...BASE, isHost: false, roomCode: 'ABCDEF', onMessage: vi.fn() }),
    );
    await wait();
    await connectSocket(socketState.lastSocket, { status: 'ok', role: 'guest' });
    await act(async () => { socketState.lastSocket._emit('disconnect', 'transport error'); });
    expect(result.current.status).toBe('reconnecting');
  });

  it('does NOT set reconnecting on intentional disconnect (io client disconnect)', async () => {
    const { result } = renderHook(() =>
      usePeer({ ...BASE, isHost: false, roomCode: 'ABCDEF', onMessage: vi.fn() }),
    );
    await wait();
    await connectSocket(socketState.lastSocket, { status: 'ok', role: 'guest' });
    const statusBefore = result.current.status;
    await act(async () => { socketState.lastSocket._emit('disconnect', 'io client disconnect'); });
    expect(result.current.status).toBe(statusBefore);
  });

  it('re-emits register after transport reconnect event', async () => {
    renderHook(() =>
      usePeer({ ...BASE, isHost: false, roomCode: 'ABCDEF', onMessage: vi.fn() }),
    );
    await wait();
    await connectSocket(socketState.lastSocket, { status: 'ok', role: 'guest' });

    const registersBefore = socketState.lastSocket.emitted.filter(
      (e: { event: string }) => e.event === 'register',
    ).length;
    await act(async () => { socketState.lastSocket._emit('reconnect'); });
    const registersAfter = socketState.lastSocket.emitted.filter(
      (e: { event: string }) => e.event === 'register',
    ).length;
    expect(registersAfter).toBe(registersBefore + 1);
  });

  it('sets status to disconnected on reconnect_failed', async () => {
    const { result } = renderHook(() =>
      usePeer({ ...BASE, isHost: false, roomCode: 'ABCDEF', onMessage: vi.fn() }),
    );
    await wait();
    await act(async () => { socketState.lastSocket._emit('reconnect_failed'); });
    expect(result.current.status).toBe('disconnected');
    expect(result.current.lastError).toBe('Could not reconnect to server.');
  });

  it('increments retryCount on reconnect_attempt', async () => {
    const { result } = renderHook(() =>
      usePeer({ ...BASE, isHost: false, roomCode: 'ABCDEF', onMessage: vi.fn() }),
    );
    await wait();
    await act(async () => { socketState.lastSocket._emit('reconnect_attempt', 3); });
    expect(result.current.retryCount).toBe(3);
  });
});
