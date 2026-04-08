import { describe, it, expect } from 'vitest';
import { flipGameStatePerspective } from '../utils/gameStatePerspective';
import { troop, tactic, makeFlag, makeState } from './helpers';

// ── Helpers ───────────────────────────────────────────────────────────────────

const P1 = troop('red', 5);
const P2 = troop('blue', 3);
const O1 = troop('green', 7);
const O2 = troop('purple', 2);
const T1 = tactic('leader', 'Leader', 'leader');
const T2 = tactic('companion', 'Companion Cavalry', 'companion');

// ── Hand swapping ─────────────────────────────────────────────────────────────

describe('flipGameStatePerspective — hand swapping', () => {
  it('swaps playerHand and opponentHand', () => {
    const state = makeState({ playerHand: [P1, P2], opponentHand: [O1, O2] });
    const flipped = flipGameStatePerspective(state);
    expect(flipped.playerHand.map(c => c.id)).toEqual([O1.id, O2.id]);
    expect(flipped.opponentHand.map(c => c.id)).toEqual([P1.id, P2.id]);
  });

  it('swaps playerTacticsPlayed and opponentTacticsPlayed', () => {
    const state = makeState({ playerTacticsPlayed: 2, opponentTacticsPlayed: 1 });
    const flipped = flipGameStatePerspective(state);
    expect(flipped.playerTacticsPlayed).toBe(1);
    expect(flipped.opponentTacticsPlayed).toBe(2);
  });

  it('a double flip restores the original hands', () => {
    const state = makeState({ playerHand: [P1, P2], opponentHand: [O1, O2] });
    const restored = flipGameStatePerspective(flipGameStatePerspective(state));
    expect(restored.playerHand.map(c => c.id)).toEqual([P1.id, P2.id]);
    expect(restored.opponentHand.map(c => c.id)).toEqual([O1.id, O2.id]);
  });
});

// ── Flag formation swapping ───────────────────────────────────────────────────

describe('flipGameStatePerspective — flag formations', () => {
  it('swaps formation.player and formation.opponent on each flag', () => {
    const flags = Array.from({ length: 9 }, () => makeFlag());
    flags[0] = makeFlag([P1, P2], [O1]);
    const state = makeState({ flags });
    const flipped = flipGameStatePerspective(state);

    expect(flipped.flags[0].formation.player.cards.map(c => c.id)).toEqual([O1.id]);
    expect(flipped.flags[0].formation.opponent.cards.map(c => c.id)).toEqual([P1.id, P2.id]);
  });

  it('preserves unmodified flags after the swap', () => {
    const flags = Array.from({ length: 9 }, () => makeFlag());
    flags[3] = makeFlag([T1], [T2]);
    const state = makeState({ flags });
    const flipped = flipGameStatePerspective(state);

    expect(flipped.flags[3].formation.player.cards.map(c => c.id)).toEqual([T2.id]);
    expect(flipped.flags[3].formation.opponent.cards.map(c => c.id)).toEqual([T1.id]);
  });

  it('double flip restores flag formations', () => {
    const flags = Array.from({ length: 9 }, () => makeFlag());
    flags[2] = makeFlag([P1], [O1, O2]);
    const state = makeState({ flags });
    const restored = flipGameStatePerspective(flipGameStatePerspective(state));

    expect(restored.flags[2].formation.player.cards.map(c => c.id)).toEqual([P1.id]);
    expect(restored.flags[2].formation.opponent.cards.map(c => c.id)).toEqual([O1.id, O2.id]);
  });
});

// ── Flag winner inversion ─────────────────────────────────────────────────────

describe('flipGameStatePerspective — flag winners', () => {
  it("inverts 'player' winner to 'opponent'", () => {
    const flags = Array.from({ length: 9 }, () => makeFlag([], [], [], null));
    flags[0] = makeFlag([], [], [], 'player');
    const state = makeState({ flags });
    const flipped = flipGameStatePerspective(state);
    expect(flipped.flags[0].winner).toBe('opponent');
  });

  it("inverts 'opponent' winner to 'player'", () => {
    const flags = Array.from({ length: 9 }, () => makeFlag([], [], [], null));
    flags[1] = makeFlag([], [], [], 'opponent');
    const state = makeState({ flags });
    const flipped = flipGameStatePerspective(state);
    expect(flipped.flags[1].winner).toBe('player');
  });

  it("keeps null winner as null", () => {
    const flags = Array.from({ length: 9 }, () => makeFlag([], [], [], null));
    const state = makeState({ flags });
    const flipped = flipGameStatePerspective(state);
    flipped.flags.forEach(f => expect(f.winner).toBeNull());
  });

  it('double flip restores winners', () => {
    const flags = Array.from({ length: 9 }, () => makeFlag([], [], [], null));
    flags[4] = makeFlag([], [], [], 'player');
    flags[8] = makeFlag([], [], [], 'opponent');
    const state = makeState({ flags });
    const restored = flipGameStatePerspective(flipGameStatePerspective(state));
    expect(restored.flags[4].winner).toBe('player');
    expect(restored.flags[8].winner).toBe('opponent');
  });
});

// ── Local UI state cleared ────────────────────────────────────────────────────

describe('flipGameStatePerspective — local state cleared', () => {
  it('clears selectedCard and selectedFlag', () => {
    const state = makeState({ selectedCard: P1, selectedFlag: 3 });
    const flipped = flipGameStatePerspective(state);
    expect(flipped.selectedCard).toBeNull();
    expect(flipped.selectedFlag).toBeNull();
  });

  it('clears pending modal states', () => {
    const state = makeState({
      pendingTactics: { effect: 'fog' } as never,
      pendingTraitor: { cardId: 'x', sourceFlagIndex: 0 } as never,
      deserterActive: true,
      traitorActive: true,
      redeployState: true,
    });
    const flipped = flipGameStatePerspective(state);
    expect(flipped.pendingTactics).toBeNull();
    expect(flipped.pendingTraitor).toBeNull();
    expect(flipped.deserterActive).toBe(false);
    expect(flipped.traitorActive).toBe(false);
    expect(flipped.redeployState).toBe(false);
  });

  it('clears leader/companion/shield pending and scoutDrawStep', () => {
    const state = makeState({
      leaderPending: { side: 'player' } as never,
      companionPending: true as never,
      shieldPending: true as never,
      scoutDrawStep: { draws: [] } as never,
    });
    const flipped = flipGameStatePerspective(state);
    expect(flipped.leaderPending).toBeUndefined();
    expect(flipped.companionPending).toBeUndefined();
    expect(flipped.shieldPending).toBeUndefined();
    expect(flipped.scoutDrawStep).toBeNull();
  });
});

// ── Game status inversion ─────────────────────────────────────────────────────
//
// Regression: flipGameStatePerspective did not invert gameStatus, causing both
// players to see "Victory!" when the game ended in multiplayer.

describe('flipGameStatePerspective — gameStatus', () => {
  it("flips 'playerWon' to 'opponentWon'", () => {
    const state = makeState({ gameStatus: 'playerWon' });
    const flipped = flipGameStatePerspective(state);
    expect(flipped.gameStatus).toBe('opponentWon');
  });

  it("flips 'opponentWon' to 'playerWon'", () => {
    const state = makeState({ gameStatus: 'opponentWon' });
    const flipped = flipGameStatePerspective(state);
    expect(flipped.gameStatus).toBe('playerWon');
  });

  it("keeps 'playing' as 'playing'", () => {
    const state = makeState({ gameStatus: 'playing' });
    const flipped = flipGameStatePerspective(state);
    expect(flipped.gameStatus).toBe('playing');
  });

  it('double flip restores gameStatus', () => {
    for (const s of ['playing', 'playerWon', 'opponentWon'] as const) {
      const state = makeState({ gameStatus: s });
      expect(flipGameStatePerspective(flipGameStatePerspective(state)).gameStatus).toBe(s);
    }
  });
});

// ── Immutability ──────────────────────────────────────────────────────────────

describe('flipGameStatePerspective — immutability', () => {
  it('does not mutate the original state', () => {
    const flags = Array.from({ length: 9 }, () => makeFlag([P1], [O1]));
    const state = makeState({ playerHand: [P1, P2], opponentHand: [O1], flags });
    const playerHandBefore = [...state.playerHand];
    const opponentHandBefore = [...state.opponentHand];

    flipGameStatePerspective(state);

    expect(state.playerHand.map(c => c.id)).toEqual(playerHandBefore.map(c => c.id));
    expect(state.opponentHand.map(c => c.id)).toEqual(opponentHandBefore.map(c => c.id));
    expect(state.flags[0].formation.player.cards.map(c => c.id)).toEqual([P1.id]);
  });
});
