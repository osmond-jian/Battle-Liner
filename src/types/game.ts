export type TurnPhase = 'player' | 'opponent' | 'awaitingDraw';

export type CardColor = 'red' | 'blue' | 'green' | 'orange' | 'purple' | 'yellow';
export type CardValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type CardType = 'troop' | 'tactic';

export interface Card {
  id: string;
  type: CardType;
  color?: CardColor;
  value?: CardValue;
  name?: string;
  effect?: string;
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
  modifiers: string[];
  winner: 'player' | 'opponent' | null;
}

/**
 * Single canonical game state type used by the reducer, context, and all components.
 * (Previously split across GameState and FullGameState — now unified.)
 */
export interface LastOpponentMove {
  summary: string;
  highlightCardId?: string;
  highlightFlagIndex?: number;
}

export interface GameState {
  gameStatus: 'playing' | 'playerWon' | 'opponentWon' | 'draw';
  playerHand: Card[];
  opponentHand: Card[];
  deck: Card[];
  tacticsDeck: Card[];
  flags: Flag[];
  selectedCard: Card | null;
  selectedFlag: number | null;
  playerTacticsPlayed: number;
  opponentTacticsPlayed: number;
  deserterActive: boolean;
  traitorActive: boolean;
  redeployState: boolean;
  leaderPending?: { card: Card; flagIndex: number };
  companionPending?: { card: Card; flagIndex: number };
  shieldPending?: { card: Card; flagIndex: number };
  pendingTraitor: { card: Card; fromFlag: number } | null;
  pendingTactics: { card: Card; flagIndex: number } | null;
  scoutDrawStep: {
    drawn: Card[];
    remaining: number;
    /** Cards the player has selected to return to decks (phase 2 of new Scout flow). */
    discardPicks?: Card[];
  } | null;
  lastOpponentMove?: LastOpponentMove | null;
  lastPlayerMove?: LastOpponentMove | null;
  playerPlayedTactics: Card[];
  opponentPlayedTactics: Card[];
}
