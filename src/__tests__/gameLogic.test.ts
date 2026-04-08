import { describe, it, expect } from 'vitest';
import {
  getSlotCount,
  createDeck,
  shuffleDeck,
  createFlags,
  calculateFormationStrength,
  checkWinner,
  checkGameOver,
} from '../utils/gameLogic';
import { troop, makeFlag } from './helpers';

// ─── getSlotCount ─────────────────────────────────────────────────────────────

describe('getSlotCount', () => {
  it('returns 3 for a normal flag', () => {
    const flag = makeFlag();
    expect(getSlotCount(flag)).toBe(3);
  });

  it('returns 4 for a flag with the mud modifier', () => {
    const flag = makeFlag([], [], ['mud']);
    expect(getSlotCount(flag)).toBe(4);
  });

  it('returns 3 for a flag with fog (fog does not change slot count)', () => {
    const flag = makeFlag([], [], ['fog']);
    expect(getSlotCount(flag)).toBe(3);
  });
});

// ─── createDeck ───────────────────────────────────────────────────────────────

describe('createDeck', () => {
  it('creates exactly 60 cards (6 colors × 10 values)', () => {
    expect(createDeck()).toHaveLength(60);
  });

  it('produces unique card ids', () => {
    const deck = createDeck();
    const ids = deck.map(c => c.id);
    expect(new Set(ids).size).toBe(60);
  });

  it('assigns type troop to all cards', () => {
    const deck = createDeck();
    expect(deck.every(c => c.type === 'troop')).toBe(true);
  });

  it('contains cards for every color-value combination', () => {
    const deck = createDeck();
    const colors = ['red', 'blue', 'green', 'orange', 'purple', 'yellow'];
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    for (const color of colors) {
      for (const value of values) {
        expect(deck.some(c => c.id === `${color}-${value}`)).toBe(true);
      }
    }
  });
});

// ─── shuffleDeck ──────────────────────────────────────────────────────────────

describe('shuffleDeck', () => {
  it('returns a new array, not the original reference', () => {
    const deck = createDeck();
    expect(shuffleDeck(deck)).not.toBe(deck);
  });

  it('preserves all cards (same length, same ids)', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled).toHaveLength(deck.length);
    const originalIds = new Set(deck.map(c => c.id));
    shuffled.forEach(c => expect(originalIds.has(c.id)).toBe(true));
  });
});

// ─── createFlags ─────────────────────────────────────────────────────────────

describe('createFlags', () => {
  it('creates 9 flags', () => {
    expect(createFlags()).toHaveLength(9);
  });

  it('assigns ids 1-9', () => {
    const flags = createFlags();
    flags.forEach((f, i) => expect(f.id).toBe(i + 1));
  });

  it('initializes each flag with empty formations and no winner', () => {
    const flags = createFlags();
    flags.forEach(f => {
      expect(f.formation.player.cards).toHaveLength(0);
      expect(f.formation.opponent.cards).toHaveLength(0);
      expect(f.winner).toBeNull();
      expect(f.modifiers).toHaveLength(0);
    });
  });
});

// ─── calculateFormationStrength ───────────────────────────────────────────────

describe('calculateFormationStrength', () => {
  it('returns 0 for fewer than 3 cards', () => {
    expect(calculateFormationStrength([])).toBe(0);
    expect(calculateFormationStrength([troop('red', 5)])).toBe(0);
    expect(calculateFormationStrength([troop('red', 5), troop('red', 6)])).toBe(0);
  });

  it('returns 0 if any card has value 0 (unconfigured tactic)', () => {
    // Two valid troops + one unconfigured tactic (value 0 is excluded)
    const unconfiguredTactic: import('../types/game').Card = {
      id: 't1', type: 'tactic', name: 'Leader', effect: 'wild', value: 0,
    };
    const result = calculateFormationStrength([
      troop('red', 7), troop('red', 8), unconfiguredTactic,
    ]);
    // Only 2 valid cards → returns 0
    expect(result).toBe(0);
  });

  it('scores a Wedge (straight flush): sum × 10000', () => {
    // red 7, 8, 9 → sum=24, wedge → 240000
    const cards = [troop('red', 7), troop('red', 8), troop('red', 9)];
    expect(calculateFormationStrength(cards)).toBe(24 * 10000);
  });

  it('scores a Phalanx (three of a kind): sum × 1000', () => {
    // 6, 6, 6 (different colors) → sum=18, phalanx → 18000
    const cards = [troop('red', 6), troop('blue', 6), troop('green', 6)];
    expect(calculateFormationStrength(cards)).toBe(18 * 1000);
  });

  it('scores a Battalion Order (flush, not straight): sum × 100', () => {
    // red 1, 5, 10 → sum=16, flush, not straight → 1600
    const cards = [troop('red', 1), troop('red', 5), troop('red', 10)];
    expect(calculateFormationStrength(cards)).toBe(16 * 100);
  });

  it('scores a Skirmish Line (straight, not flush): sum × 10', () => {
    // red5, blue6, green7 → sum=18, straight not flush → 180
    const cards = [troop('red', 5), troop('blue', 6), troop('green', 7)];
    expect(calculateFormationStrength(cards)).toBe(18 * 10);
  });

  it('scores a Host (no special combo): raw sum', () => {
    // red1, blue5, green9 → sum=15, no combo → 15
    const cards = [troop('red', 1), troop('blue', 5), troop('green', 9)];
    expect(calculateFormationStrength(cards)).toBe(15);
  });

  it('Wedge beats Phalanx when both are strong', () => {
    const wedge = [troop('red', 1), troop('red', 2), troop('red', 3)]; // 6 × 10000
    const phalanx = [troop('red', 9), troop('blue', 9), troop('green', 9)]; // 27 × 1000
    expect(calculateFormationStrength(wedge)).toBeGreaterThan(calculateFormationStrength(phalanx));
  });
});

// ─── checkWinner ─────────────────────────────────────────────────────────────

describe('checkWinner', () => {
  it('returns the existing winner immediately if already set', () => {
    const flag = makeFlag([], [], [], 'player');
    expect(checkWinner(flag)).toBe('player');
  });

  it('returns null when neither side has a complete formation', () => {
    const flag = makeFlag([troop('red', 5)], [troop('blue', 6)]);
    expect(checkWinner(flag)).toBeNull();
  });

  it('player wins when their formation is stronger (both complete)', () => {
    // player: wedge 7-8-9 red; opponent: phalanx 6-6-6
    const flag = makeFlag(
      [troop('red', 7), troop('red', 8), troop('red', 9)],
      [troop('red', 6), troop('blue', 6), troop('green', 6)],
    );
    expect(checkWinner(flag)).toBe('player');
  });

  it('opponent wins when their formation is stronger (both complete)', () => {
    const flag = makeFlag(
      [troop('red', 1), troop('blue', 5), troop('green', 9)],  // host: 15
      [troop('red', 8), troop('red', 9), troop('red', 10)],    // wedge: 27×10000
    );
    expect(checkWinner(flag)).toBe('opponent');
  });

  it('returns null on a tie (identical formation strength)', () => {
    // Both play the same values/formation type
    const flag = makeFlag(
      [troop('red', 1), troop('blue', 2), troop('green', 3)],  // skirmish 6×10
      [troop('orange', 1), troop('purple', 2), troop('yellow', 3)],
    );
    expect(checkWinner(flag)).toBeNull();
  });

  it('player wins early when opponent literally cannot beat the completed formation', () => {
    // Player complete: phalanx 9-9-9 = 27000. Opponent has one card [1r].
    // Available pool is empty → opponent cannot complete formation → no combo beats it.
    const flag = makeFlag(
      [troop('red', 9), troop('blue', 9), troop('green', 9)],
      [troop('red', 1)],
    );
    expect(checkWinner(flag, [], [], [])).toBe('player');
  });

  it('no early win when player hand contains a card that could beat the opponent', () => {
    // Opponent complete: phalanx of 6s = 18000.
    // Player has red-2, red-3 on flag. If red-4 is in their hand → wedge (9×10000=90000) > 18000.
    const flag = makeFlag(
      [troop('red', 2), troop('red', 3)],
      [troop('red', 6), troop('blue', 6), troop('green', 6)],
    );
    const playerHand = [troop('red', 4)];
    // With red-4 available, player CAN form a wedge → opponent should NOT get early win.
    expect(checkWinner(flag, [], [], playerHand)).toBeNull();
  });

  it('opponent wins early when player has only unwinnable cards available', () => {
    // Opponent phalanx of 6s (18000). Player has [2r, 3r] on flag.
    // Only blue-5 available: [2r,3r,5b] = not straight (2,3,5), not flush → sum=10 < 18000.
    const flag = makeFlag(
      [troop('red', 2), troop('red', 3)],
      [troop('red', 6), troop('blue', 6), troop('green', 6)],
    );
    const playerHand = [troop('blue', 5)];
    expect(checkWinner(flag, [], [], playerHand)).toBe('opponent');
  });

  // ── Fog modifier tests ──────────────────────────────────────────────────────

  it('fog: winner is determined by raw total, not formation type', () => {
    // Under fog, a plain-sum 10+10+10=30 beats a wedge 1+2+3=6
    const flag = makeFlag(
      [troop('red', 10), troop('blue', 10), troop('green', 10)], // total 30
      [troop('red', 1), troop('red', 2), troop('red', 3)],       // wedge but total 6
      ['fog'],
    );
    expect(checkWinner(flag)).toBe('player');
  });

  it('fog: null on equal totals', () => {
    const flag = makeFlag(
      [troop('red', 5), troop('blue', 5), troop('green', 5)],
      [troop('orange', 5), troop('purple', 5), troop('yellow', 5)],
      ['fog'],
    );
    expect(checkWinner(flag)).toBeNull();
  });

  // ── Fog early-claim tests ───────────────────────────────────────────────────
  //
  // Regression coverage for: "3 ones vs a 4 on a fog flag" — does early-claim
  // fire correctly?  The key rule: you must have a COMPLETE formation to claim.
  // If the incomplete side can still reach a higher total, no early claim.

  it('fog: opponent [1,1,1] cannot claim early when player has [4] and troops available', () => {
    // Opponent total = 3, complete. Player has [4] (incomplete, 1/3).
    // Player hand has troops → player can reach at least 4+1+1=6 > 3.
    const flag = makeFlag(
      [troop('red', 4)],
      [troop('red', 1), troop('blue', 1), troop('green', 1)],
      ['fog'],
    );
    const playerHand = [troop('blue', 2), troop('green', 3)];
    // checkWinner(flag, deck, opponentHand, playerHand)
    expect(checkWinner(flag, [], [], playerHand)).toBeNull();
  });

  it('fog: opponent [1,1,1] CAN claim early when player has [4] but zero troops available', () => {
    // Player has a 4 on flag but no more cards to complete their formation.
    // Incomplete formation → opponent's complete [1,1,1] (total 3) is awarded.
    const flag = makeFlag(
      [troop('red', 4)],
      [troop('red', 1), troop('blue', 1), troop('green', 1)],
      ['fog'],
    );
    expect(checkWinner(flag, [], [], [])).toBe('opponent');
  });

  it('fog: player with complete [4,5,6] claims early when opponent [1] cannot reach total 15', () => {
    // Player total = 15, complete. Opponent has [1] (needs 2 more).
    // Best opponent can reach: 1 + 10 + 10 = 21 > 15 → cannot claim yet.
    // But with only low-value cards available (max 3), opponent max = 1+3+2 = 6 < 15 → player claims.
    const flag = makeFlag(
      [troop('red', 4), troop('blue', 5), troop('green', 6)],
      [troop('red', 1)],
      ['fog'],
    );
    const opponentPool = [troop('blue', 2), troop('green', 3)]; // max total from pool: 2+3=5; 1+5=6 < 15
    expect(checkWinner(flag, [], opponentPool, [])).toBe('player');
  });

  it('fog: player with complete [4,5,6] cannot claim early when opponent [1] could reach higher total', () => {
    // Player total = 15. Opponent has [1] and could draw two 8s: 1+8+8 = 17 > 15.
    const flag = makeFlag(
      [troop('red', 4), troop('blue', 5), troop('green', 6)],
      [troop('red', 1)],
      ['fog'],
    );
    const opponentPool = [troop('blue', 8), troop('green', 8)];
    expect(checkWinner(flag, [], opponentPool, [])).toBeNull();
  });

  it('fog: neither side can claim while both formations are incomplete', () => {
    const flag = makeFlag(
      [troop('red', 9)],
      [troop('blue', 7)],
      ['fog'],
    );
    expect(checkWinner(flag, [], [], [])).toBeNull();
  });

  // ── Mud modifier tests ──────────────────────────────────────────────────────

  it('mud: requires 4 cards per side before winner is declared', () => {
    // With mud, 3 cards each is NOT complete yet → no winner
    const flag = makeFlag(
      [troop('red', 7), troop('red', 8), troop('red', 9)],
      [troop('red', 6), troop('blue', 6), troop('green', 6)],
      ['mud'],
    );
    expect(checkWinner(flag)).toBeNull();
  });

  it('mud: declares winner when both sides have 4 cards', () => {
    const flag = makeFlag(
      [troop('red', 7), troop('red', 8), troop('red', 9), troop('red', 10)], // wedge+
      [troop('red', 6), troop('blue', 6), troop('green', 6), troop('orange', 6)],
      ['mud'],
    );
    // player sum=34×10000 vs opponent phalanx sum=24×1000
    expect(checkWinner(flag)).toBe('player');
  });
});

// ─── checkGameOver ────────────────────────────────────────────────────────────

describe('checkGameOver', () => {
  it('returns null when no flags are won', () => {
    expect(checkGameOver(createFlags())).toBeNull();
  });

  it('player wins with 5 non-consecutive flags', () => {
    const flags = createFlags();
    [0, 2, 4, 6, 8].forEach(i => { flags[i].winner = 'player'; });
    expect(checkGameOver(flags)).toBe('player');
  });

  it('opponent wins with 5 flags', () => {
    const flags = createFlags();
    [0, 1, 2, 3, 4].forEach(i => { flags[i].winner = 'opponent'; });
    expect(checkGameOver(flags)).toBe('opponent');
  });

  it('player wins with 3 consecutive flags (middle)', () => {
    const flags = createFlags();
    [3, 4, 5].forEach(i => { flags[i].winner = 'player'; });
    expect(checkGameOver(flags)).toBe('player');
  });

  it('opponent wins with 3 consecutive flags (end)', () => {
    const flags = createFlags();
    [6, 7, 8].forEach(i => { flags[i].winner = 'opponent'; });
    expect(checkGameOver(flags)).toBe('opponent');
  });

  it('returns null for 4 player flags (not consecutive)', () => {
    const flags = createFlags();
    [0, 2, 5, 7].forEach(i => { flags[i].winner = 'player'; });
    expect(checkGameOver(flags)).toBeNull();
  });

  it('returns null when player has 2 consecutive flags but not 3', () => {
    const flags = createFlags();
    [4, 5].forEach(i => { flags[i].winner = 'player'; });
    expect(checkGameOver(flags)).toBeNull();
  });
});
