import { GameState } from '../types/game';
import { createDeck, createFlags, createTacticsDeck, shuffleDeck } from '../utils/gameLogic';

export function createInitialState(): GameState {
  const troopDeck = createDeck();
  const tacticsDeck = shuffleDeck(createTacticsDeck());

  const playerHand = troopDeck.slice(0, 7);
  const opponentHand = troopDeck.slice(7, 14);
  const remainingDeck = troopDeck.slice(14);

  return {
    deck: remainingDeck,
    tacticsDeck,
    flags: createFlags(),

    playerHand,
    opponentHand,

    playerTacticsPlayed: 0,
    opponentTacticsPlayed: 0,

    selectedCard: null,
    selectedFlag: null,

    gameStatus: 'playing',

    scoutDrawStep: null,
    pendingTactics: null,
    pendingTraitor: null,

    deserterActive: false,
    traitorActive: false,
    redeployState: false,
    leaderPending: undefined,
  };
}
