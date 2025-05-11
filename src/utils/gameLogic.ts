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
        value,
        type:"troop",
        name:"none",
        effect:"none",
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
    modifiers:[],
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
  availableCards: Card[],
  requiredCards: number = 3
): boolean {
  const completedStrength = calculateFormationStrength(completedFormation);
  const needed = requiredCards - opponentFormation.cards.length;

  if (needed <= 0) return false; // Opponent already has enough cards to be scored normally

  const allOptions = getCombinations(availableCards, needed);

  for (const combo of allOptions) {
    const hypothetical = {
      cards: [...opponentFormation.cards, ...combo],
      owner: 'opponent' as const,
    };
    if (calculateFormationStrength(hypothetical) > completedStrength) {
      return false; // There exists a combo that beats the formation
    }
  }

  return true; // No possible combo can win
}



function calculateFormationStrength(formation: Formation): number {
  if (formation.cards.length < 3) return 0;
  // Sort by value for straight detection
  const validCards = formation.cards.filter(c => c.value !== undefined && c.color !== undefined);
  const sortedCards = [...validCards].sort((a, b) => a.value! - b.value!);

  //check for formations
  const isFlush = validCards.every(card => card.color === validCards[0].color);
  const isStraight = sortedCards.every((card, i) => {
    if (i === 0) return true;
    return card.value! === sortedCards[i - 1].value! + 1;
  });
  const isThreeOfKind = validCards.every(card => card.value === validCards[0].value);
  const sum = validCards.reduce((acc, card) => acc + (card.value ?? 0), 0);  

  // Apply multipliers for special combinations
  if (isFlush && isStraight) return sum * 10000; // Straight flush
  if (isThreeOfKind) return sum * 1000
  if (isFlush) return sum * 100; // Flush
  if (isStraight) return sum * 10; // Straight
  
  return sum;
}

export function checkWinner(flag: Flag, deck: Card[] = [], opponentHand: Card[] = []): 'player' | 'opponent' | null {
  if (flag.winner) return flag.winner;

  const { player, opponent } = flag.formation;
  const playerCards = player.cards;
  const opponentCards = opponent.cards;

  const hasFog = flag.modifiers.includes('fog');
  const requiredCards = flag.modifiers.includes('mud') ? 4 : 3;

  // Fog logic: compare total card values
  if (hasFog && playerCards.length === requiredCards && opponentCards.length === requiredCards) {
    const playerTotal = playerCards.reduce((sum, c) => sum + (c.value || 0), 0);
    const opponentTotal = opponentCards.reduce((sum, c) => sum + (c.value || 0), 0);
    return playerTotal > opponentTotal ? 'player' : opponentTotal > playerTotal ? 'opponent' : null;
  }

  // Normal case
  const playerStrength = calculateFormationStrength(player);
  const opponentStrength = calculateFormationStrength(opponent);

  if (playerCards.length === requiredCards && opponentCards.length === requiredCards) {
    if (playerStrength > opponentStrength) return 'player';
    if (opponentStrength > playerStrength) return 'opponent';
  }

  // Early win check
  if (
    playerCards.length === requiredCards &&
    opponentCards.length < requiredCards &&
    opponentCannotWin(player, opponent, [...deck, ...opponentHand], requiredCards)
  ) {
    return 'player';
  }

  if (
    opponentCards.length === requiredCards &&
    playerCards.length < requiredCards &&
    opponentCannotWin(opponent, player, deck, requiredCards)
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

export function createTacticsDeck(): Card[] {
  return [
    {
      id: 't1',
      type: 'tactic',
      name: 'Leader',
      effect: 'wild',
      color: undefined,
      value: 0,
    },
    {
      id: 't2',
      type: 'tactic',
      name: 'Leader',
      effect: 'wild',
      color: undefined,
      value: 0,
    },
    {
      id: 't3',
      type: 'tactic',
      name: 'Companion Cavalry',
      effect: 'value8',
      color: undefined,
      value: 8,
    },
    {
      id: 't4',
      type: 'tactic',
      name: 'Shield Bearers',
      effect: 'value≤3',
      color: undefined,
      value: 3,
    },
    {
      id: 't5',
      type: 'tactic',
      name: 'Fog',
      effect: 'fog',
      color: undefined,
      value: 0,
    },
    {
      id: 't6',
      type: 'tactic',
      name: 'Mud',
      effect: 'mud',
      color: undefined,
      value: 0,
    },
    {
      id: 't7',
      type: 'tactic',
      name: 'Scout',
      effect: 'scout',
      color: undefined,
      value: 0,
    },
    {
      id: 't8',
      type: 'tactic',
      name: 'Redeploy',
      effect: 'redeploy',
      color: undefined,
      value: 0,
    },
    {
      id: 't9',
      type: 'tactic',
      name: 'Deserter',
      effect: 'deserter',
      color: undefined,
      value: 0,
    },
    {
      id: 't10',
      type: 'tactic',
      name: 'Traitor',
      effect: 'traitor',
      color: undefined,
      value: 0,
    },
  ];
}

