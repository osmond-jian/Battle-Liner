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

export type GameState = 'playing' | 'playerWon' | 'opponentWon';