import { Card, CardColor, CardValue, Flag, Formation } from '../types/game';

const COLORS: CardColor[] = ['red', 'blue', 'green', 'orange', 'purple', 'yellow'];
const VALUES: CardValue[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const TOTAL_CARDS = COLORS.length * VALUES.length;

export function createDeck(): Card[] {
  const deck: Card[] = [];
  COLORS.forEach(color => {
    VALUES.forEach(value => {
      deck.push({
        id: `${color}-${value}`,
        color,
        value
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
      opponent: { cards: [], owner: null }
    },
    winner: null
  }));
}

function isValidFormation(formation: Formation): boolean {
  return formation.cards.length <= 3;
}

function calculateFormationStrength(formation: Formation): number {
  if (formation.cards.length < 3) return 0;
  
  // Sort by value for straight detection
  const sortedCards = [...formation.cards].sort((a, b) => a.value - b.value);
  
  // Check for color flush
  const isFlush = formation.cards.every(card => card.color === formation.cards[0].color);
  
  // Check for straight
  const isStraight = sortedCards.every((card, i) => {
    if (i === 0) return true;
    return card.value === sortedCards[i - 1].value + 1;
  });

  // Calculate base sum
  const sum = formation.cards.reduce((acc, card) => acc + card.value, 0);

  // Apply multipliers for special combinations
  if (isFlush && isStraight) return sum * 4; // Straight flush
  if (isFlush) return sum * 2; // Flush
  if (isStraight) return sum * 2; // Straight
  
  return sum;
}

export function checkWinner(flag: Flag): 'player' | 'opponent' | null {
  if (flag.winner) return flag.winner;
  
  const playerStrength = calculateFormationStrength(flag.formation.player);
  const opponentStrength = calculateFormationStrength(flag.formation.opponent);
  
  if (flag.formation.player.cards.length === 3 && flag.formation.opponent.cards.length === 3) {
    if (playerStrength > opponentStrength) return 'player';
    if (opponentStrength > playerStrength) return 'opponent';
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

export function makeOpponentMove(
  flags: Flag[],
  hand: Card[],
  deck: Card[]
): { flagIndex: number; card: Card } | null {
  // Simple AI: randomly choose a valid flag and card
  const validFlags = flags.filter(flag => 
    flag.winner === null && 
    flag.formation.opponent.cards.length < 3
  );
  
  if (validFlags.length === 0 || hand.length === 0) return null;
  
  const randomFlag = validFlags[Math.floor(Math.random() * validFlags.length)];
  const randomCard = hand[Math.floor(Math.random() * hand.length)];
  
  return {
    flagIndex: flags.findIndex(f => f.id === randomFlag.id),
    card: randomCard
  };
}