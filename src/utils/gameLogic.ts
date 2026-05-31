import { Card, Flag, Formation } from '../types/game';
import { CARD_COLORS, CARD_VALUES } from '../constants';

/** Returns the number of card slots for a flag (4 with Mud modifier, 3 otherwise). */
export function getSlotCount(flag: Flag): number {
  return flag.modifiers.includes('mud') ? 4 : 3;
}

export const TOTAL_CARDS = CARD_COLORS.length * CARD_VALUES.length;

export function createDeck(): Card[] {
  const deck: Card[] = [];
  CARD_COLORS.forEach(color => {
    CARD_VALUES.forEach(value => {
      deck.push({
        id: `${color}-${value}`,
        color,
        value,
        type: 'troop',
        name: 'none',
        effect: 'none',
      });
    });
  });
  return shuffleDeck(deck);
}

export function shuffleDeck(deck: Card[]): Card[] {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
}

export function createFlags(): Flag[] {
  return Array.from({ length: 9 }, (_, i) => ({
    id: i + 1,
    formation: {
      player: { cards: [], owner: null },
      opponent: { cards: [], owner: null },
    },
    modifiers: [],
    winner: null,
  }));
}

/**
 * Returns every troop card not currently placed on any flag.
 * This is derived purely from public board state — no deck order or hand
 * contents are consulted, matching the actual Battle Line claiming rule.
 */
export function buildPublicPool(flags: Flag[]): Card[] {
  const usedIds = new Set<string>();
  for (const flag of flags) {
    for (const card of flag.formation.player.cards) {
      if (card.type === 'troop') usedIds.add(card.id);
    }
    for (const card of flag.formation.opponent.cards) {
      if (card.type === 'troop') usedIds.add(card.id);
    }
  }
  const pool: Card[] = [];
  for (const color of CARD_COLORS) {
    for (const value of CARD_VALUES) {
      const id = `${color}-${value}`;
      if (!usedIds.has(id)) {
        pool.push({ id, type: 'troop', color, value, name: 'none', effect: 'none' });
      }
    }
  }
  return pool;
}

/**
 * Calculates the formation strength of a set of cards.
 * Requires at least 3 valid (colored, positive-value) cards — returns 0 otherwise.
 * Exported so the AI scorer can delegate completed-formation scoring here.
 */
export function calculateFormationStrength(cards: Card[]): number {
  const validCards = cards.filter(c => c.value != null && c.value > 0 && c.color != null);
  if (validCards.length < 3) return 0;
  const sortedCards = [...validCards].sort((a, b) => a.value! - b.value!);

  const isFlush = validCards.every(card => card.color === validCards[0].color);
  const isStraight = sortedCards.every((card, i) => {
    if (i === 0) return true;
    return card.value! === sortedCards[i - 1].value! + 1;
  });
  const isThreeOfKind = validCards.every(card => card.value === validCards[0].value);
  const sum = validCards.reduce((acc, card) => acc + (card.value ?? 0), 0);

  if (isFlush && isStraight) return sum * 10000; // Wedge
  if (isThreeOfKind)         return sum * 1000;  // Phalanx
  if (isFlush)               return sum * 100;   // Battalion Order
  if (isStraight)            return sum * 10;    // Skirmish Line

  return sum; // Host
}

/**
 * Returns true when the incomplete side CAN form a formation stronger than
 * completedStrength, given their already-committed cards plus any cards from pool.
 *
 * Enumerates formation types (wedge → phalanx → battalion → skirmish → host)
 * from strongest to weakest and short-circuits on the first winning option.
 * O(1) per formation type — no card combinations are generated.
 */
function canBeatWithPool(
  completedStrength: number,
  committed: Card[],
  poolSet: Set<string>,
  requiredCards: number,
): boolean {
  const needed = requiredCards - committed.length;
  if (needed <= 0) return false;

  // Exclude unconfigured tactic wildcards (no color or value).
  const valid = committed.filter(c => c.value != null && c.value > 0 && c.color != null);
  const cVals  = valid.map(c => c.value as number);
  const cCols  = valid.map(c => c.color as string);
  const colSet = new Set(cCols);

  const inPool = (color: string, value: number) => poolSet.has(`${color}-${value}`);

  // Committed cards that share a value prevent wedge/skirmish (a run has each value once).
  const hasDupeVals = cVals.some((v, i) => cVals.indexOf(v) !== i);

  // ── Wedge (straight flush): sum × 10000 ──────────────────────────────────
  if (!hasDupeVals && colSet.size <= 1) {
    const tryColors = colSet.size === 1 ? [cCols[0]] : CARD_COLORS;
    for (const color of tryColors) {
      for (let s = 1; s + requiredCards - 1 <= 10; s++) {
        const run = Array.from({ length: requiredCards }, (_, k) => s + k);
        if (!cVals.every(v => run.includes(v))) continue;
        const free = run.filter(v => !cVals.includes(v));
        if (free.every(v => inPool(color, v))) {
          if (run.reduce((a, b) => a + b, 0) * 10000 > completedStrength) return true;
        }
      }
    }
  }
  if (completedStrength > 10 * requiredCards * 1000) return false;

  // ── Phalanx (N of a kind): sum × 1000 ────────────────────────────────────
  if (new Set(cVals).size <= 1) {
    const tryVals = cVals.length > 0 ? [cVals[0]] : CARD_VALUES;
    for (const v of tryVals) {
      const inCommitted  = cVals.filter(cv => cv === v).length;
      const colsInCommit = new Set(valid.filter(c => c.value === v).map(c => c.color as string));
      let fromPool = 0;
      for (const col of CARD_COLORS) {
        if (!colsInCommit.has(col) && inPool(col, v)) fromPool++;
      }
      if (inCommitted + fromPool >= requiredCards) {
        if (v * requiredCards * 1000 > completedStrength) return true;
      }
    }
  }
  if (completedStrength > 10 * requiredCards * 100) return false;

  // ── Battalion Order (flush, not straight): sum × 100 ─────────────────────
  if (colSet.size <= 1) {
    const tryColors = colSet.size === 1 ? [cCols[0]] : CARD_COLORS;
    for (const color of tryColors) {
      const baseVals   = valid.filter(c => c.color === color).map(c => c.value as number);
      const need       = requiredCards - baseVals.length;
      const usedVals   = new Set(baseVals);
      const poolVals: number[] = [];
      for (let v = 10; v >= 1 && poolVals.length < need; v--) {
        if (!usedVals.has(v) && inPool(color, v)) poolVals.push(v);
      }
      if (poolVals.length >= need) {
        const sum = baseVals.reduce((a, b) => a + b, 0) + poolVals.reduce((a, b) => a + b, 0);
        if (sum * 100 > completedStrength) return true;
      }
    }
  }
  if (completedStrength > 10 * requiredCards * 10) return false;

  // ── Skirmish Line (straight, not flush): sum × 10 ────────────────────────
  if (!hasDupeVals) {
    for (let s = 1; s + requiredCards - 1 <= 10; s++) {
      const run = Array.from({ length: requiredCards }, (_, k) => s + k);
      if (!cVals.every(v => run.includes(v))) continue;
      const free = run.filter(v => !cVals.includes(v));
      if (free.every(v => CARD_COLORS.some(col => inPool(col, v)))) {
        if (run.reduce((a, b) => a + b, 0) * 10 > completedStrength) return true;
      }
    }
  }
  if (completedStrength > 10 * requiredCards) return false;

  // ── Host (highest raw sum) ────────────────────────────────────────────────
  const baseSum = cVals.reduce((a, b) => a + b, 0);
  const allPoolVals: number[] = [];
  for (const col of CARD_COLORS) {
    for (const v of CARD_VALUES) {
      if (inPool(col, v)) allPoolVals.push(v);
    }
  }
  allPoolVals.sort((a, b) => b - a);
  if (allPoolVals.length >= needed) {
    if (baseSum + allPoolVals.slice(0, needed).reduce((a, b) => a + b, 0) > completedStrength) {
      return true;
    }
  }

  return false;
}

/**
 * Fog variant: returns true when the incomplete side can reach a raw total
 * greater than completedTotal using their committed cards plus `needed` pool cards.
 */
function fogCanBeat(
  completedTotal: number,
  committed: Card[],
  pool: Card[],
  requiredCards: number,
): boolean {
  const needed = requiredCards - committed.length;
  if (needed <= 0) return false;
  const committedSum = committed.reduce((s, c) => s + (c.value ?? 0), 0);
  const poolVals = pool
    .filter(c => c.type === 'troop' && c.value)
    .map(c => c.value as number)
    .sort((a, b) => b - a);
  if (poolVals.length < needed) return false; // can't complete the formation
  return committedSum + poolVals.slice(0, needed).reduce((a, b) => a + b, 0) > completedTotal;
}

/**
 * Determines the winner of a flag.
 *
 * `pool` should be all troop cards not currently placed on any flag — use
 * `buildPublicPool(allFlags)` in production.  Tests may pass an explicit pool
 * to control which cards are considered available.
 */
export function checkWinner(flag: Flag, pool: Card[] = []): 'player' | 'opponent' | null {
  if (flag.winner) return flag.winner;

  const { player, opponent } = flag.formation;
  const playerCards   = player.cards;
  const opponentCards = opponent.cards;

  const hasFog       = flag.modifiers.includes('fog');
  const requiredCards = getSlotCount(flag);

  // ── Both sides complete ────────────────────────────────────────────────────
  if (playerCards.length === requiredCards && opponentCards.length === requiredCards) {
    if (hasFog) {
      const pt = playerCards.reduce((s, c) => s + (c.value ?? 0), 0);
      const ot = opponentCards.reduce((s, c) => s + (c.value ?? 0), 0);
      if (pt > ot) return 'player';
      if (ot > pt) return 'opponent';
      return null;
    }
    const ps = calculateFormationStrength(playerCards);
    const os = calculateFormationStrength(opponentCards);
    if (ps > os) return 'player';
    if (os > ps) return 'opponent';
    return null;
  }

  // ── Early-win checks ───────────────────────────────────────────────────────
  const troopPool = pool.filter(c => c.type === 'troop');

  if (hasFog) {
    if (playerCards.length === requiredCards && opponentCards.length < requiredCards) {
      const pt = playerCards.reduce((s, c) => s + (c.value ?? 0), 0);
      if (!fogCanBeat(pt, opponentCards, troopPool, requiredCards)) return 'player';
    }
    if (opponentCards.length === requiredCards && playerCards.length < requiredCards) {
      const ot = opponentCards.reduce((s, c) => s + (c.value ?? 0), 0);
      if (!fogCanBeat(ot, playerCards, troopPool, requiredCards)) return 'opponent';
    }
    return null;
  }

  const poolSet = new Set(troopPool.map(c => c.id));

  if (
    playerCards.length === requiredCards &&
    opponentCards.length < requiredCards &&
    !canBeatWithPool(calculateFormationStrength(playerCards), opponentCards, poolSet, requiredCards)
  ) {
    return 'player';
  }
  if (
    opponentCards.length === requiredCards &&
    playerCards.length < requiredCards &&
    !canBeatWithPool(calculateFormationStrength(opponentCards), playerCards, poolSet, requiredCards)
  ) {
    return 'opponent';
  }

  return null;
}

export function checkGameOver(flags: Flag[]): 'player' | 'opponent' | null {
  const playerFlags = flags.filter(flag => flag.winner === 'player').length;
  const opponentFlags = flags.filter(flag => flag.winner === 'opponent').length;

  if (playerFlags >= 5) return 'player';
  if (opponentFlags >= 5) return 'opponent';

  // Check for three adjacent flags
  for (let i = 0; i < flags.length - 2; i++) {
    if (
      flags[i].winner === 'player' &&
      flags[i + 1].winner === 'player' &&
      flags[i + 2].winner === 'player'
    ) {
      return 'player';
    }
    if (
      flags[i].winner === 'opponent' &&
      flags[i + 1].winner === 'opponent' &&
      flags[i + 2].winner === 'opponent'
    ) {
      return 'opponent';
    }
  }

  return null;
}

// Re-exported from src/data/tacticCards.ts for backwards compatibility.
export { createTacticsDeck } from '../data/tacticCards';
