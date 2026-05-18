/**
 * RoomManager unit tests.
 *
 * Pure in-memory logic — no mocking needed. Tests cover the dual-index
 * invariants (rooms Map + socketToRoom Map) and the cleanup interval.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RoomManager } from './rooms';

const HOST = { socketId: 's1', playerId: 'p1', playerName: 'Alice' } as const;
const GUEST = { socketId: 'g1', playerId: 'p2', playerName: 'Bob' } as const;
const CODE = 'ABCDEF';

describe('RoomManager', () => {
  let rooms: RoomManager;

  beforeEach(() => {
    rooms = new RoomManager();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── upsertHost ──────────────────────────────────────────────────────────────

  describe('upsertHost', () => {
    it('creates a new room and returns hadGuest: false', () => {
      const result = rooms.upsertHost(CODE, HOST);
      expect(result.hadGuest).toBe(false);
      expect(rooms.count()).toBe(1);
    });

    it('persists host fields correctly', () => {
      rooms.upsertHost(CODE, HOST);
      const room = rooms.get(CODE);
      expect(room?.hostSocketId).toBe('s1');
      expect(room?.hostPlayerId).toBe('p1');
      expect(room?.hostName).toBe('Alice');
    });

    it('stores gameState when provided', () => {
      const gs = { status: 'playing' };
      rooms.upsertHost(CODE, { ...HOST, gameState: gs });
      expect(rooms.get(CODE)?.gameState).toBe(gs);
    });

    it('indexes the host socket for O(1) lookup', () => {
      rooms.upsertHost(CODE, HOST);
      expect(rooms.findBySocketId('s1')).toBe(CODE);
    });

    it('reconnect: updates hostSocketId, removes old socketId from index', () => {
      rooms.upsertHost(CODE, HOST);
      rooms.upsertHost(CODE, { ...HOST, socketId: 's2' });
      expect(rooms.findBySocketId('s1')).toBeUndefined();
      expect(rooms.findBySocketId('s2')).toBe(CODE);
      expect(rooms.get(CODE)?.hostSocketId).toBe('s2');
    });

    it('reconnect: returns hadGuest: false when no guest yet', () => {
      rooms.upsertHost(CODE, HOST);
      const result = rooms.upsertHost(CODE, { ...HOST, socketId: 's2' });
      expect(result.hadGuest).toBe(false);
    });

    it('reconnect: returns hadGuest: true when a guest is in the room', () => {
      rooms.upsertHost(CODE, HOST);
      rooms.upsertGuest(CODE, GUEST);
      const result = rooms.upsertHost(CODE, { ...HOST, socketId: 's2' });
      expect(result.hadGuest).toBe(true);
    });

    it('reconnect: updates gameState when provided', () => {
      const gs1 = { turn: 1 };
      const gs2 = { turn: 5 };
      rooms.upsertHost(CODE, { ...HOST, gameState: gs1 });
      rooms.upsertHost(CODE, { ...HOST, socketId: 's2', gameState: gs2 });
      expect(rooms.get(CODE)?.gameState).toBe(gs2);
    });

    it('reconnect: preserves existing gameState when not provided', () => {
      const gs = { turn: 3 };
      rooms.upsertHost(CODE, { ...HOST, gameState: gs });
      rooms.upsertHost(CODE, { ...HOST, socketId: 's2' }); // no gameState
      expect(rooms.get(CODE)?.gameState).toBe(gs);
    });

    it('does not create duplicate rooms on reconnect', () => {
      rooms.upsertHost(CODE, HOST);
      rooms.upsertHost(CODE, { ...HOST, socketId: 's2' });
      expect(rooms.count()).toBe(1);
    });
  });

  // ── upsertGuest ─────────────────────────────────────────────────────────────

  describe('upsertGuest', () => {
    beforeEach(() => {
      rooms.upsertHost(CODE, HOST);
    });

    it('returns true and persists guest fields', () => {
      const ok = rooms.upsertGuest(CODE, GUEST);
      expect(ok).toBe(true);
      const room = rooms.get(CODE);
      expect(room?.guestSocketId).toBe('g1');
      expect(room?.guestPlayerId).toBe('p2');
      expect(room?.guestName).toBe('Bob');
    });

    it('indexes the guest socket for O(1) lookup', () => {
      rooms.upsertGuest(CODE, GUEST);
      expect(rooms.findBySocketId('g1')).toBe(CODE);
    });

    it('returns false for an unknown room code', () => {
      const ok = rooms.upsertGuest('ZZZZZZ', GUEST);
      expect(ok).toBe(false);
    });

    it('rejoin: replaces old guestSocketId and updates the index', () => {
      rooms.upsertGuest(CODE, GUEST);
      rooms.upsertGuest(CODE, { ...GUEST, socketId: 'g2' });
      expect(rooms.findBySocketId('g1')).toBeUndefined();
      expect(rooms.findBySocketId('g2')).toBe(CODE);
      expect(rooms.get(CODE)?.guestSocketId).toBe('g2');
    });
  });

  // ── get & findBySocketId ────────────────────────────────────────────────────

  describe('get / findBySocketId', () => {
    it('get returns undefined for unknown code', () => {
      expect(rooms.get('ZZZZZZ')).toBeUndefined();
    });

    it('findBySocketId returns undefined for unknown socketId', () => {
      expect(rooms.findBySocketId('nonexistent')).toBeUndefined();
    });

    it('findBySocketId works for both host and guest sockets', () => {
      rooms.upsertHost(CODE, HOST);
      rooms.upsertGuest(CODE, GUEST);
      expect(rooms.findBySocketId('s1')).toBe(CODE);
      expect(rooms.findBySocketId('g1')).toBe(CODE);
    });
  });

  // ── updateState ─────────────────────────────────────────────────────────────

  describe('updateState', () => {
    it('updates gameState and isGuestTurn', () => {
      rooms.upsertHost(CODE, HOST);
      const gs = { status: 'playing' };
      rooms.updateState(CODE, gs, true);
      const room = rooms.get(CODE);
      expect(room?.gameState).toBe(gs);
      expect(room?.isGuestTurn).toBe(true);
    });

    it('updates isGuestTurn independently', () => {
      rooms.upsertHost(CODE, HOST);
      rooms.updateState(CODE, {}, false);
      expect(rooms.get(CODE)?.isGuestTurn).toBe(false);
      rooms.updateState(CODE, {}, true);
      expect(rooms.get(CODE)?.isGuestTurn).toBe(true);
    });

    it('does not throw for unknown code', () => {
      expect(() => rooms.updateState('ZZZZZZ', {})).not.toThrow();
    });
  });

  // ── markDisconnected ────────────────────────────────────────────────────────

  describe('markDisconnected', () => {
    it('keeps the socketToRoom entry so reconnect can find the room', () => {
      rooms.upsertHost(CODE, HOST);
      rooms.markDisconnected('s1');
      expect(rooms.findBySocketId('s1')).toBe(CODE);
    });

    it('does not throw for unknown socketId', () => {
      expect(() => rooms.markDisconnected('nonexistent')).not.toThrow();
    });
  });

  // ── count ───────────────────────────────────────────────────────────────────

  describe('count', () => {
    it('returns 0 initially', () => {
      expect(rooms.count()).toBe(0);
    });

    it('counts multiple independent rooms correctly', () => {
      rooms.upsertHost('ROOM01', { socketId: 's1', playerId: 'p1', playerName: 'Alice' });
      rooms.upsertHost('ROOM02', { socketId: 's2', playerId: 'p2', playerName: 'Bob' });
      expect(rooms.count()).toBe(2);
    });
  });

  // ── startCleanup ────────────────────────────────────────────────────────────

  describe('startCleanup', () => {
    it('removes rooms that have been inactive longer than 30 minutes', () => {
      vi.useFakeTimers();
      // Room created at fake t=0.
      rooms.upsertHost(CODE, HOST);
      rooms.startCleanup();

      // Advance 35 minutes: cleanup fires (at 5, 10, ..., 35 min intervals).
      // At t=35 min, lastActivity=0, diff=35 min > 30 min TTL → removed.
      vi.advanceTimersByTime(35 * 60 * 1000);
      expect(rooms.count()).toBe(0);
    });

    it('keeps recently active rooms', () => {
      vi.useFakeTimers();
      rooms.upsertHost(CODE, HOST);
      rooms.startCleanup();

      // After only 10 minutes the room is not yet stale (10 min < 30 min TTL).
      vi.advanceTimersByTime(10 * 60 * 1000);
      expect(rooms.count()).toBe(1);
    });

    it('removes the stale room from both indexes', () => {
      vi.useFakeTimers();
      rooms.upsertHost(CODE, HOST);
      rooms.upsertGuest(CODE, GUEST);
      rooms.startCleanup();

      vi.advanceTimersByTime(35 * 60 * 1000);
      expect(rooms.findBySocketId('s1')).toBeUndefined();
      expect(rooms.findBySocketId('g1')).toBeUndefined();
    });
  });
});
