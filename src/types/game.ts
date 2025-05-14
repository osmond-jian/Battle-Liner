export type CardColor = 'red' | 'blue' | 'green' | 'orange' | 'purple' | 'yellow';
export type CardValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type CardType = 'troop' | 'tactic';

export interface Card {
  id: string;
  type: CardType;
  color?: CardColor; // Only for troop cards
  value?: CardValue; // Only for troop cards
  name?: string;     // For tactic cards (e.g. "Leader", "Scout", etc.)
  effect?:string;
}

export interface Formation {
  cards: Card[];
  owner: 'player' | 'opponent' | null;
}

export interface Flag {
  id: number;
  formation: {
    player: Formation;
    opponent: Formation;
  };
  modifiers:string[];
  winner: 'player' | 'opponent' | null;
}

export interface GameState {
  gameStatus: 'no-game' | 'playing' | 'playerWon' | 'opponentWon';
  opponentHand: Card[];
  playerHand: Card[];
  deck: Card[];
  tacticsDeck: Card[];
  flags: Flag[];
  selectedCard: Card | null;
  selectedFlag: number | null;
  deserterActive: boolean;
  traitorActive: boolean;
  pendingTraitor: { card: Card; fromFlag: number } | null;
  pendingTactics: { card: Card; flagIndex: number } | null;
  scoutDrawStep: {
    drawn: Card[];
    remaining: number;
    keep?: Card;
    discards?: Card[];
  } | null;
  redeployState: boolean;
}