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

function getCombinations(cards: Card[], size: number): Card[][] {
  const results: Card[][] = [];
  const recurse = (combo: Card[], index: number) => {
    if (combo.length === size) {
      results.push(combo);
      return;
    }
    for (let i = index; i < cards.length; i++) {
      recurse([...combo, cards[i]], i + 1);
    }
  };
  recurse([], 0);
  return results;
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
 * Returns true when no combination of `availableCards` can give `opponentFormation`
 * a higher formation strength than `completedFormation`. Used for normal (non-fog) flags.
 */
function opponentCannotWin(
  completedFormation: Formation,
  opponentFormation: Formation,
  availableCards: Card[],
  requiredCards: number = 3
): boolean {
  const completedStrength = calculateFormationStrength(completedFormation.cards);
  const needed = requiredCards - opponentFormation.cards.length;

  if (needed <= 0) return false;

  const allOptions = getCombinations(availableCards, needed);

  for (const combo of allOptions) {
    const hypotheticalCards = [...opponentFormation.cards, ...combo];
    if (calculateFormationStrength(hypotheticalCards) > completedStrength) {
      return false;
    }
  }

  return true;
}

/**
 * Returns true when no combination of `availableCards` can give the incomplete
 * side a higher card-value total than `completedTotal`. Used for fog flags.
 */
function opponentCannotWinFog(
  completedTotal: number,
  incompleteCards: Card[],
  availableCards: Card[],
  requiredCards: number
): boolean {
  const needed = requiredCards - incompleteCards.length;
  if (needed <= 0) return false;

  const currentTotal = incompleteCards.reduce((sum, c) => sum + (c.value ?? 0), 0);
  const allOptions = getCombinations(availableCards, needed);

  for (const combo of allOptions) {
    const comboTotal = combo.reduce((sum, c) => sum + (c.value ?? 0), 0);
    if (currentTotal + comboTotal > completedTotal) {
      return false;
    }
  }

  return true;
}

export function checkWinner(flag: Flag, deck: Card[] = [], opponentHand: Card[] = [], playerHand: Card[] = []): 'player' | 'opponent' | null {
  if (flag.winner) return flag.winner;

  const { player, opponent } = flag.formation;
  const playerCards = player.cards;
  const opponentCards = opponent.cards;

  const hasFog = flag.modifiers.includes('fog');
  // Mud requires 4 cards per side; applies independently of Fog.
  const requiredCards = getSlotCount(flag);

  // ── Both sides have completed their formation ──────────────────────────────
  if (playerCards.length === requiredCards && opponentCards.length === requiredCards) {
    if (hasFog) {
      // Fog: winner is whoever has the higher raw total, formation type is ignored.
      const playerTotal = playerCards.reduce((sum, c) => sum + (c.value ?? 0), 0);
      const opponentTotal = opponentCards.reduce((sum, c) => sum + (c.value ?? 0), 0);
      if (playerTotal > opponentTotal) return 'player';
      if (opponentTotal > playerTotal) return 'opponent';
      return null; // tie
    }
    // Normal: compare formation strength.
    const ps = calculateFormationStrength(playerCards);
    const os = calculateFormationStrength(opponentCards);
    if (ps > os) return 'player';
    if (os > ps) return 'opponent';
    return null;
  }

  // ── Early-win checks (one side is complete, the other isn't yet) ───────────
  // Only consider troop cards when determining what the incomplete side could
  // still draw — unconfigured tactic cards have unknown future values and would
  // corrupt the combination scoring if included.
  // When checking early wins, each side's "reachable" cards are:
  //   deck cards + that side's current hand (cards they could still play to this flag).
  const troopPool = [...deck, ...opponentHand].filter(c => c.type === 'troop');
  const playerTroopPool = [...deck, ...playerHand].filter(c => c.type === 'troop');

  if (hasFog) {
    if (playerCards.length === requiredCards && opponentCards.length < requiredCards) {
      const playerTotal = playerCards.reduce((sum, c) => sum + (c.value ?? 0), 0);
      if (opponentCannotWinFog(playerTotal, opponentCards, troopPool, requiredCards)) {
        return 'player';
      }
    }
    if (opponentCards.length === requiredCards && playerCards.length < requiredCards) {
      const opponentTotal = opponentCards.reduce((sum, c) => sum + (c.value ?? 0), 0);
      if (opponentCannotWinFog(opponentTotal, playerCards, playerTroopPool, requiredCards)) {
        return 'opponent';
      }
    }
  } else {
    if (
      playerCards.length === requiredCards &&
      opponentCards.length < requiredCards &&
      opponentCannotWin(player, opponent, troopPool, requiredCards)
    ) {
      return 'player';
    }
    if (
      opponentCards.length === requiredCards &&
      playerCards.length < requiredCards &&
      opponentCannotWin(opponent, player, playerTroopPool, requiredCards)
    ) {
      return 'opponent';
    }
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
