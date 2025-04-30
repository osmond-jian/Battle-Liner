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

function opponentCannotWin(
  completedFormation: Formation,
  opponentFormation: Formation,
  availableCards: Card[]
): boolean {
  const completedStrength = calculateFormationStrength(completedFormation);
  const needed = 3 - opponentFormation.cards.length;

  if (needed <= 0) return false; // Already has 3 cards — handled by normal logic

  const allOptions = getCombinations(availableCards, needed);

  for (const combo of allOptions) {
    const hypothetical = {
      cards: [...opponentFormation.cards, ...combo],
      owner: 'opponent' as const,
    };
    if (calculateFormationStrength(hypothetical) > completedStrength) {
      return false; // Can still win
    }
  }

  return true; // No combo can win
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

  //Check for three-of-a-kind
  const isThreeOfKind = sortedCards.every(card => card.value === formation.cards[0].value)

  // Calculate base sum
  const sum = formation.cards.reduce((acc, card) => acc + card.value, 0);

  // Apply multipliers for special combinations
  if (isFlush && isStraight) return sum * 10000; // Straight flush
  if (isThreeOfKind) return sum * 1000
  if (isFlush) return sum * 100; // Flush
  if (isStraight) return sum * 10; // Straight
  
  return sum;
}

export function checkWinner(flag: Flag, deck: Card[] = [], opponentHand: Card[] = []): 'player' | 'opponent' | null {
  if (flag.winner) return flag.winner;

  const playerCards = flag.formation.player.cards;
  const opponentCards = flag.formation.opponent.cards;

  const playerStrength = calculateFormationStrength(flag.formation.player);
  const opponentStrength = calculateFormationStrength(flag.formation.opponent);

  // Normal case: both sides have full formations
  if (playerCards.length === 3 && opponentCards.length === 3) {
    if (playerStrength > opponentStrength) return 'player';
    if (opponentStrength > playerStrength) return 'opponent';
  }

  // Early win check: player has full, opponent can't win
  if (
    playerCards.length === 3 &&
    opponentCards.length < 3 &&
    opponentCannotWin(flag.formation.player, flag.formation.opponent, [...deck, ...opponentHand])
  ) {
    return 'player';
  }

  // Early win check: opponent has full, player can't win
  if (
    opponentCards.length === 3 &&
    playerCards.length < 3 &&
    opponentCannotWin(flag.formation.opponent, flag.formation.player, deck) // we don't see opponent's hand
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