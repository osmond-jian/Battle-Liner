import { Card, Flag } from '../types/game';

// For now, a simple AI that randomly picks a card and flag
export function useOpponentAI() {
  function getMove(
    hand: Card[],
    flags: Flag[],
    deck: Card[]
  ): { card: Card; flagIndex: number } | null {
    const deckCheck = deck;
    if (!deckCheck){
      console.log("No Deck");//change to improve Computer reasoning later
    }
    const playableCards = hand.filter(card => card != null);
    const openFlags = flags
      .map((f, i) => (f.winner || f.formation.opponent.cards.length >= 3 ? null : i))
      .filter(i => i != null) as number[];

    if (playableCards.length === 0 || openFlags.length === 0) return null;

    const card = playableCards[Math.floor(Math.random() * playableCards.length)];
    const flagIndex = openFlags[Math.floor(Math.random() * openFlags.length)];

    return { card, flagIndex };
  }

  return { getMove };
}
