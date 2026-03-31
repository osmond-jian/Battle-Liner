import type { Card, Flag } from '../types/game';
import type { Move } from '../types/Move';

// ─── Formation scoring helpers ────────────────────────────────────────────────

/**
 * Scores a completed or partial troop formation.
 * Returns 0 for < 2 valid cards. Penalises nothing — higher is better.
 */
function scoreFormation(cards: Card[]): number {
  const valid = cards.filter(c => c.color !== undefined && c.value !== undefined);
  if (valid.length < 2) return 0;

  const sorted = [...valid].sort((a, b) => a.value! - b.value!);
  const sum = valid.reduce((acc, c) => acc + c.value!, 0);

  const isFlush = valid.every(c => c.color === valid[0].color);
  const isStraight = sorted.every((c, i) => i === 0 || c.value! === sorted[i - 1].value! + 1);
  const isSameValue = valid.every(c => c.value === valid[0].value);

  // Completed formation — mirrors the multipliers in gameLogic.ts
  if (valid.length >= 3) {
    if (isFlush && isStraight) return sum * 10000;
    if (isSameValue)            return sum * 1000;
    if (isFlush)                return sum * 100;
    if (isStraight)             return sum * 10;
    return sum;
  }

  // Partial (2-card) formation — reward progress toward strong combinations
  let potential = sum * 2; // base: card values matter
  if (isSameValue) potential += 60;  // likely phalanx
  if (isFlush && isStraight) potential += 50; // likely wedge
  else if (isFlush)     potential += 25;
  else if (isStraight)  potential += 20;
  return potential;
}

/**
 * Returns a 0-4 "centrality" bonus for a flag index (0-8).
 * Flags 3-5 (the middle three) are most valuable for the consecutive-win condition.
 */
function flagCentralityBonus(flagIndex: number): number {
  return [0, 1, 2, 3, 4, 3, 2, 1, 0][flagIndex] ?? 0;
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useOpponentAI() {
  /**
   * Returns the opponent's best move using a greedy heuristic:
   *   score(card, flag) = formation potential of playing card there
   *                     + flag centrality bonus
   *                     + defensive bonus when player is ahead on the flag
   */
  function getMove(hand: Card[], flags: Flag[], deck: Card[]): Move | null {
    // Only consider troop cards — tactic cards require interactive flows the AI
    // can't yet drive. If the hand has only tactics, fall back to random below.
    const troopCards = hand.filter(
      c => c.type === 'troop' && c.color !== undefined && c.value !== undefined
    );

    const playableFlags = flags
      .map((f, i) => ({ flag: f, index: i }))
      .filter(({ flag }) => {
        if (flag.winner) return false;
        const required = flag.modifiers.includes('mud') ? 4 : 3;
        return flag.formation.opponent.cards.length < required;
      });

    if (playableFlags.length === 0) return null;

    // Fall back: if no troop cards, pick a random tactic card on a random flag
    // (we can't fully drive tactic flows, but at least don't deadlock).
    const cardsToConsider = troopCards.length > 0 ? troopCards : hand;
    if (cardsToConsider.length === 0) return null;

    let bestScore = -Infinity;
    let bestCard = cardsToConsider[0];
    let bestFlagIndex = playableFlags[0].index;

    for (const { flag, index } of playableFlags) {
      const myCards = flag.formation.opponent.cards;
      const theirCards = flag.formation.player.cards;
      const centrality = flagCentralityBonus(index) * 5;

      // Defensive pressure: bonus when the player already has more cards on this flag
      const defensiveBonus = theirCards.length > myCards.length ? 15 : 0;

      for (const card of cardsToConsider) {
        if (card.type !== 'troop') continue; // skip tactics in scoring loop

        const hypothetical = [...myCards, card];
        const formationScore = scoreFormation(hypothetical);
        const score = formationScore + centrality + defensiveBonus;

        if (score > bestScore) {
          bestScore = score;
          bestCard = card;
          bestFlagIndex = index;
        }
      }
    }

    // If only tactics remain, pick the first one on a random playable flag
    if (bestCard.type === 'tactic') {
      const randomFlag = playableFlags[Math.floor(Math.random() * playableFlags.length)];
      bestFlagIndex = randomFlag.index;
    }

    return {
      player: 'opponent',
      action: bestCard.type === 'tactic' ? 'useTactic' : 'playCard',
      card: bestCard,
      flagIndex: bestFlagIndex,
    };
  }

  return { getMove };
}
