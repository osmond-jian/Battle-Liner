export type CardColor = 'red' | 'blue' | 'green' | 'orange' | 'purple' | 'yellow';
export type CardValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface Card {
  id: string;
  color: CardColor;
  value: CardValue;
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
  winner: 'player' | 'opponent' | null;
}

export type GameState = 'playing' | 'playerWon' | 'opponentWon';