/**
 * usePeer hook tests.
 *
 * Testing strategy for WebRTC multiplayer:
 *
 * Real PeerJS opens WebRTC connections through a cloud signaling server, which
 * is impossible in a jsdom test environment (no browser WebRTC APIs, no network).
 * Instead we:
 *   1. Mock the 'peerjs' module entirely with a lightweight fake class that
 *      synchronously fires the same events (open, connection, data, close, error).
 *   2. Use @testing-library/react's `renderHook` + `act` to drive state updates.
 *   3. Test that usePeer correctly transitions through PeerStatus states and that
 *      sendState / sendInitState format messages correctly.
 *
 * What we're NOT testing here (out of scope for unit tests):
 *   - Actual WebRTC negotiation / STUN/TURN traversal
 *   - Network latency, packet loss, reconnection
 *   - The real PeerJS cloud signaling server
 *   These are covered by manual integration testing in two browser tabs.
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePeer, type PeerMessage } from '../hooks/usePeer';
import { makeState } from './helpers';

// ── vi.hoisted: shared mutable state accessible inside vi.mock factory ────────
//
// vi.mock factories are hoisted above module-level `let`/`const` declarations,
// so they cannot reference variables declared later in the file.
// vi.hoisted() runs at hoist-time too, making its return value safe to use
// inside the factory closure.

const peerState = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lastPeer: null as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lastConn: null as any,
  // All connections ever created (useful for reconnect tests).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allConns: [] as any[],
}));

// ── Fake PeerJS module ────────────────────────────────────────────────────────

vi.mock('peerjs', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function makeFakeConn(): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlers: Record<string, any[]> = {};
    const sent: unknown[] = [];
    const conn = {
      open: true,
      sent,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      on(event: string, cb: any) { (handlers[event] ??= []).push(cb); },
      send(msg: unknown) { sent.push(msg); },
      close() { handlers['close']?.forEach((cb: () => void) => cb()); },
      _emit(event: string, ...args: unknown[]) {
        handlers[event]?.forEach((cb: (...a: unknown[]) => void) => cb(...args));
      },
    };
    peerState.lastConn = conn;
    peerState.allConns.push(conn);
    return conn;
  }

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

    connect(_peerId: string, _opts?: unknown) { return makeFakeConn(); }

    destroy() { this.destroyed = true; }

    _emit(event: string, ...args: unknown[]) {
      this._h[event]?.forEach((cb: (...a: unknown[]) => void) => cb(...args));
    }
  }

  return { Peer: FakePeer };
});

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  peerState.lastPeer = null;
  peerState.lastConn = null;
  peerState.allConns = [];
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllTimers();
});

/** Wait long enough for the dynamic import + async useEffect to run. */
async function waitForPeerInit() {
  await act(async () => { await new Promise(r => setTimeout(r, 30)); });
}

// ── No-op path ────────────────────────────────────────────────────────────────

describe('usePeer — no-op sentinel', () => {
  it('stays idle and never creates a Peer when roomCode is __noop__', async () => {
    const { result } = renderHook(() =>
      usePeer({ isHost: false, roomCode: '__noop__', onMessage: vi.fn() }),
    );
    await waitForPeerInit();
    expect(result.current.status).toBe('idle');
    expect(peerState.lastPeer).toBeNull();
  });

  it('stays idle when roomCode is empty string', async () => {
    const { result } = renderHook(() =>
      usePeer({ isHost: false, roomCode: '', onMessage: vi.fn() }),
    );
    await waitForPeerInit();
    expect(result.current.status).toBe('idle');
  });
});

// ── Host path ─────────────────────────────────────────────────────────────────

describe('usePeer — host', () => {
  it('creates the Peer with the battleline-{roomCode} peer ID', async () => {
    renderHook(() =>
      usePeer({ isHost: true, roomCode: 'XYZABC', onMessage: vi.fn() }),
    );
    await waitForPeerInit();
    expect(peerState.lastPeer?.id).toBe('battleline-XYZABC');
  });

  it('transitions idle → waiting when the Peer opens', async () => {
    const { result } = renderHook(() =>
      usePeer({ isHost: true, roomCode: 'ABCDEF', onMessage: vi.fn() }),
    );
    await waitForPeerInit();
    await act(async () => { peerState.lastPeer._emit('open'); });
    expect(result.current.status).toBe('waiting');
  });

  it('transitions waiting → connected when a guest connects and the DataConnection opens', async () => {
    const { result } = renderHook(() =>
      usePeer({ isHost: true, roomCode: 'ABCDEF', onMessage: vi.fn() }),
    );
    await waitForPeerInit();
    await act(async () => { peerState.lastPeer._emit('open'); });

    const conn = peerState.lastConn; // captured by FakePeer (not set yet for host)
    // Host emits 'connection' event with a new fake conn
    await act(async () => {
      // Manually create a fresh conn object and pass it to the 'connection' event
      // We do this by triggering the event the same way PeerJS would.
      // The hook's 'connection' handler calls setupConnection(conn), then conn.on('open')
      // fires 'connected'. We need to provide a conn that will fire 'open'.
      peerState.lastPeer._emit('connection', peerState.lastConn ?? {
        open: true,
        sent: [],
        on(event: string, cb: () => void) { if (event === 'open') cb(); },
        send() {},
        close() {},
        _emit() {},
      });
    });
    // The fake conn's 'open' event fires when registered (see inline conn above)
    expect(result.current.status).toBe('connected');
  });

  it('sends a GAME_STATE message with the correct shape', async () => {
    const { result } = renderHook(() =>
      usePeer({ isHost: true, roomCode: 'ABCDEF', onMessage: vi.fn() }),
    );
    await waitForPeerInit();
    await act(async () => { peerState.lastPeer._emit('open'); });

    // Supply an auto-opening connection via the 'connection' event
    const autoConn = {
      open: true, sent: [] as unknown[],
      on(event: string, cb: () => void) { if (event === 'open') cb(); },
      send(msg: unknown) { this.sent.push(msg); },
      close() {}, _emit() {},
    };
    await act(async () => { peerState.lastPeer._emit('connection', autoConn); });

    const gs = makeState();
    act(() => { result.current.sendState(gs); });
    expect(autoConn.sent).toHaveLength(1);
    expect((autoConn.sent[0] as PeerMessage).type).toBe('GAME_STATE');
    expect((autoConn.sent[0] as { type: string; gameState: unknown }).gameState).toBe(gs);
  });

  it('sends an INIT_STATE message with guestGoesFirst flag', async () => {
    const { result } = renderHook(() =>
      usePeer({ isHost: true, roomCode: 'ABCDEF', onMessage: vi.fn() }),
    );
    await waitForPeerInit();
    await act(async () => { peerState.lastPeer._emit('open'); });

    const autoConn = {
      open: true, sent: [] as unknown[],
      on(event: string, cb: () => void) { if (event === 'open') cb(); },
      send(msg: unknown) { this.sent.push(msg); },
      close() {}, _emit() {},
    };
    await act(async () => { peerState.lastPeer._emit('connection', autoConn); });

    act(() => { result.current.sendInitState(makeState(), true); });
    expect(autoConn.sent).toHaveLength(1);
    expect((autoConn.sent[0] as PeerMessage).type).toBe('INIT_STATE');
    expect((autoConn.sent[0] as { type: string; guestGoesFirst: boolean }).guestGoesFirst).toBe(true);
  });

  it('transitions to error on peer error', async () => {
    const { result } = renderHook(() =>
      usePeer({ isHost: true, roomCode: 'ABCDEF', onMessage: vi.fn() }),
    );
    await waitForPeerInit();
    await act(async () => { peerState.lastPeer._emit('error', new Error('peer-unavailable')); });
    expect(result.current.status).toBe('error');
  });

  it('destroys the peer on unmount', async () => {
    const { unmount } = renderHook(() =>
      usePeer({ isHost: true, roomCode: 'ABCDEF', onMessage: vi.fn() }),
    );
    await waitForPeerInit();
    const peer = peerState.lastPeer;
    unmount();
    expect(peer.destroyed).toBe(true);
  });

  it('warns (does not throw) when sendState is called before connected', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() =>
      usePeer({ isHost: true, roomCode: 'ABCDEF', onMessage: vi.fn() }),
    );
    await waitForPeerInit();
    // Peer opened → 'waiting', but no guest connected yet — connRef is null.
    await act(async () => { peerState.lastPeer._emit('open'); });
    act(() => { result.current.sendState(makeState()); });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

// ── Guest path ────────────────────────────────────────────────────────────────

describe('usePeer — guest', () => {
  it('creates the Peer without an explicit ID (auto-ID for guest)', async () => {
    renderHook(() =>
      usePeer({ isHost: false, roomCode: 'XYZABC', onMessage: vi.fn() }),
    );
    await waitForPeerInit();
    // Guest peer is created without a specific ID (id is the auto-generated 'auto-id').
    // The key thing: the Peer constructor was NOT passed 'battleline-XYZABC'.
    expect(peerState.lastPeer?.id).toBe('auto-id');
  });

  it('transitions idle → connecting when the Peer opens', async () => {
    const { result } = renderHook(() =>
      usePeer({ isHost: false, roomCode: 'XYZABC', onMessage: vi.fn() }),
    );
    await waitForPeerInit();
    await act(async () => { peerState.lastPeer._emit('open'); });
    expect(result.current.status).toBe('connecting');
  });

  it('transitions connecting → connected when the DataConnection opens', async () => {
    const { result } = renderHook(() =>
      usePeer({ isHost: false, roomCode: 'XYZABC', onMessage: vi.fn() }),
    );
    await waitForPeerInit();
    await act(async () => { peerState.lastPeer._emit('open'); });
    // After 'open', guest calls peer.connect() → lastConn is set by FakePeer.connect().
    await act(async () => { peerState.lastConn._emit('open'); });
    expect(result.current.status).toBe('connected');
  });

  it('reaches connecting state after peer open, confirming connect() was called', async () => {
    // Verifies indirectly that the guest called peer.connect(battleline-ROOM42):
    // if connect() was not called, lastConn would be null and status would not become 'connecting'.
    const { result } = renderHook(() =>
      usePeer({ isHost: false, roomCode: 'ROOM42', onMessage: vi.fn() }),
    );
    await waitForPeerInit();
    await act(async () => { peerState.lastPeer._emit('open'); });
    expect(result.current.status).toBe('connecting');
    // lastConn was created by FakePeer.connect() — proves it was called.
    expect(peerState.lastConn).not.toBeNull();
  });

  it('calls onMessage when data arrives on the connection', async () => {
    const onMessage = vi.fn();
    renderHook(() =>
      usePeer({ isHost: false, roomCode: 'XYZABC', onMessage }),
    );
    await waitForPeerInit();
    await act(async () => { peerState.lastPeer._emit('open'); });
    await act(async () => { peerState.lastConn._emit('open'); });

    const msg: PeerMessage = { type: 'GAME_STATE', gameState: makeState() };
    await act(async () => { peerState.lastConn._emit('data', msg); });
    expect(onMessage).toHaveBeenCalledOnce();
    expect(onMessage.mock.calls[0][0]).toEqual(msg);
  });

  it('handles malformed data gracefully (logs a warning, does not crash)', async () => {
    // onMessage throws — the hook should catch and warn rather than propagate.
    const onMessage = vi.fn(() => { throw new Error('bad parse'); });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    renderHook(() =>
      usePeer({ isHost: false, roomCode: 'XYZABC', onMessage }),
    );
    await waitForPeerInit();
    await act(async () => { peerState.lastPeer._emit('open'); });
    await act(async () => { peerState.lastConn._emit('open'); });
    await act(async () => { peerState.lastConn._emit('data', '$$invalid$$'); });

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('transitions connected → reconnecting when the connection closes (will retry)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result } = renderHook(() =>
      usePeer({ isHost: false, roomCode: 'XYZABC', onMessage: vi.fn() }),
    );
    await waitForPeerInit();
    await act(async () => { peerState.lastPeer._emit('open'); });
    await act(async () => { peerState.lastConn._emit('open'); });
    expect(result.current.status).toBe('connected');

    await act(async () => { peerState.lastConn._emit('close'); });
    expect(result.current.status).toBe('reconnecting');
    vi.useRealTimers();
  });

  it('attempts a new connect() after the 3 s retry delay', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderHook(() =>
      usePeer({ isHost: false, roomCode: 'XYZABC', onMessage: vi.fn() }),
    );
    await waitForPeerInit();
    await act(async () => { peerState.lastPeer._emit('open'); });
    // First connect() was issued on 'open' — allConns has 1 entry.
    expect(peerState.allConns).toHaveLength(1);

    // Simulate the first connection closing.
    await act(async () => { peerState.allConns[0]._emit('close'); });

    // Advance past the 3 s backoff — a second connect() should fire.
    await act(async () => { vi.advanceTimersByTime(3100); });
    expect(peerState.allConns).toHaveLength(2);
    vi.useRealTimers();
  });
});

// ── Host reconnection ─────────────────────────────────────────────────────────

describe('usePeer — host reconnection', () => {
  /** Helper: open peer and accept one auto-opening connection as host. */
  async function hostWithConn(onGuestReconnect?: Mock) {
    const hookResult = renderHook(() =>
      usePeer({ isHost: true, roomCode: 'ABCDEF', onMessage: vi.fn(), onGuestReconnect }),
    );
    await waitForPeerInit();
    await act(async () => { peerState.lastPeer._emit('open'); });

    const autoConn = {
      open: true, sent: [] as unknown[],
      on(event: string, cb: () => void) { if (event === 'open') cb(); },
      send(msg: unknown) { this.sent.push(msg); },
      close() {}, _emit() {},
    };
    await act(async () => { peerState.lastPeer._emit('connection', autoConn); });
    return { ...hookResult, autoConn };
  }

  it('hadGuest starts false and becomes true after first guest connects', async () => {
    const { result } = renderHook(() =>
      usePeer({ isHost: true, roomCode: 'ABCDEF', onMessage: vi.fn() }),
    );
    await waitForPeerInit();
    expect(result.current.hadGuest).toBe(false);

    await act(async () => { peerState.lastPeer._emit('open'); });
    expect(result.current.hadGuest).toBe(false);

    const autoConn = {
      open: true, sent: [] as unknown[],
      on(event: string, cb: () => void) { if (event === 'open') cb(); },
      send() {}, close() {}, _emit() {},
    };
    await act(async () => { peerState.lastPeer._emit('connection', autoConn); });
    expect(result.current.hadGuest).toBe(true);
  });

  it('goes back to waiting (not disconnected) when the guest connection closes', async () => {
    const { result } = renderHook(() =>
      usePeer({ isHost: true, roomCode: 'ABCDEF', onMessage: vi.fn() }),
    );
    await waitForPeerInit();
    await act(async () => { peerState.lastPeer._emit('open'); });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let closeConn: any;
    const closableConn = {
      open: true, sent: [] as unknown[],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      on(event: string, cb: any) { if (event === 'open') cb(); if (event === 'close') closeConn = cb; },
      send() {}, close() {}, _emit() {},
    };
    await act(async () => { peerState.lastPeer._emit('connection', closableConn); });
    expect(result.current.status).toBe('connected');

    await act(async () => { closeConn(); });
    expect(result.current.status).toBe('waiting');
  });

  it('accepts a new guest connection after the previous one closed', async () => {
    const { result } = renderHook(() =>
      usePeer({ isHost: true, roomCode: 'ABCDEF', onMessage: vi.fn() }),
    );
    await waitForPeerInit();
    await act(async () => { peerState.lastPeer._emit('open'); });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let closeFirst: any;
    const firstConn = {
      open: true, sent: [] as unknown[],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      on(event: string, cb: any) { if (event === 'open') cb(); if (event === 'close') closeFirst = cb; },
      send() {}, close() {}, _emit() {},
    };
    await act(async () => { peerState.lastPeer._emit('connection', firstConn); });
    await act(async () => { closeFirst(); }); // guest disconnects

    // Now a second connection arrives (guest reconnects).
    const secondConn = {
      open: true, sent: [] as unknown[],
      on(event: string, cb: () => void) { if (event === 'open') cb(); },
      send() {}, close() {}, _emit() {},
    };
    await act(async () => { peerState.lastPeer._emit('connection', secondConn); });
    expect(result.current.status).toBe('connected');
  });

  it('rejects a third-party connection while a guest is already connected', async () => {
    const { autoConn } = await hostWithConn();
    expect(peerState.lastPeer /* just to reference autoConn usage */);

    // A second connection attempt arrives while the first is still open.
    const intruder = { closed: false, on() {}, send() {}, close() { this.closed = true; }, _emit() {} };
    await act(async () => { peerState.lastPeer._emit('connection', intruder); });
    expect(intruder.closed).toBe(true);
    // Original connection is still active.
    expect(autoConn.sent.length).toBe(0); // nothing disrupted
  });

  it('does NOT call onGuestReconnect on the initial connection', async () => {
    const onGuestReconnect = vi.fn();
    await hostWithConn(onGuestReconnect);
    expect(onGuestReconnect).not.toHaveBeenCalled();
  });

  it('calls onGuestReconnect when a guest reconnects after disconnecting', async () => {
    const onGuestReconnect = vi.fn();
    renderHook(() =>
      usePeer({ isHost: true, roomCode: 'ABCDEF', onMessage: vi.fn(), onGuestReconnect }),
    );
    await waitForPeerInit();
    await act(async () => { peerState.lastPeer._emit('open'); });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let closeFirst: any;
    const firstConn = {
      open: true, sent: [] as unknown[],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      on(event: string, cb: any) { if (event === 'open') cb(); if (event === 'close') closeFirst = cb; },
      send() {}, close() {}, _emit() {},
    };
    await act(async () => { peerState.lastPeer._emit('connection', firstConn); });
    expect(onGuestReconnect).not.toHaveBeenCalled();

    await act(async () => { closeFirst(); });

    const secondConn = {
      open: true, sent: [] as unknown[],
      on(event: string, cb: () => void) { if (event === 'open') cb(); },
      send() {}, close() {}, _emit() {},
    };
    await act(async () => { peerState.lastPeer._emit('connection', secondConn); });
    expect(onGuestReconnect).toHaveBeenCalledOnce();
  });

  it('sends a RESYNC_STATE message with the correct shape', async () => {
    const { result, autoConn } = await hostWithConn();
    const gs = makeState();
    act(() => { result.current.sendResync(gs, true); });
    expect(autoConn.sent).toHaveLength(1);
    expect((autoConn.sent[0] as PeerMessage).type).toBe('RESYNC_STATE');
    expect((autoConn.sent[0] as { type: string; isGuestTurn: boolean }).isGuestTurn).toBe(true);
    expect((autoConn.sent[0] as { type: string; gameState: unknown }).gameState).toBe(gs);
  });
});
