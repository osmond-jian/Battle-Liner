import { Card, Flag } from './game';

export interface FullGameState {
  deck: Card[];
  tacticsDeck: Card[];
  playerHand: Card[];
  opponentHand: Card[];
  flags: Flag[];
  selectedCard: Card | null;
  selectedFlag: number | null;
  gameStatus: 'playing' | 'playerWon' | 'opponentWon';
  playerTacticsPlayed: number;
  opponentTacticsPlayed: number;

  // Tactics effects state
  redeployState: boolean;
  deserterActive: boolean;
  traitorActive: boolean;

  // For traitor behavior
  pendingTraitor: {
    card: Card;
    fromFlag: number;
  } | null;

  // For wild tactics that need configuration (e.g. Leader)
  pendingTactics: {
    card: Card;
    flagIndex: number;
  } | null;

  // For Scout card draw flow
  scoutDrawStep: {
    drawn: Card[];
    remaining: number;
    keep?: Card;
    discards?: Card[];
  } | null;
}
