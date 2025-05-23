import { Card, Flag } from '../types/game';
import type { Move } from '../types/Move';

export function useOpponentAI() {
  function getMove(
    hand: Card[],
    flags: Flag[],
    deck: Card[]
  ): Move | null {
    if (!deck || deck.length === 0) {
      console.log("No Deck");
      return null;
    }

    const playableCards = hand.filter(card => card != null);
    const openFlags = flags
      .map((f, i) => (f.winner || f.formation.opponent.cards.length >= 3 ? null : i))
      .filter(i => i != null) as number[];

    if (playableCards.length === 0 || openFlags.length === 0) return null;

    const card = playableCards[Math.floor(Math.random() * playableCards.length)];
    const flagIndex = openFlags[Math.floor(Math.random() * openFlags.length)];

    return {
      player: 'opponent',
      action: card.type === 'tactic' ? 'useTactic' : 'playCard',
      card,
      flagIndex,
    };
  }

  return { getMove };
}
