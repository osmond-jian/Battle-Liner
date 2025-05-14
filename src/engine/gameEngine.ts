import { Card, Flag } from '../types/game';
import { FullGameState } from '../types/FullGameState';
import { createInitialState } from '../engine/initialState'
import { checkGameOver, checkWinner } from '../utils/gameLogic';

export type GameAction =
  | { type: 'SELECT_CARD'; card: Card | null }
  | { type: 'SELECT_FLAG'; flagIndex: number | null }
  | { type: 'PLAY_CARD'; card: Card; flagIndex: number; player: `player` | `opponent` }
  | { type: 'DRAW_CARD'; deckType: 'troop' | 'tactic'; player: `player` | `opponent` }
  | { type: 'START_SCOUT' }
  | { type: 'SCOUT_DRAW'; from: 'troop' | 'tactic' }
  | { type: 'SCOUT_PICK'; chosen: Card }
  | { type: 'SCOUT_DISCARD_ORDER'; discards: [Card, Card] }
  | { type: 'APPLY_TACTIC'; card: Card; flagIndex: number }
  | { type: 'SET_GAME_STATUS'; status: 'playing' | 'playerWon' | 'opponentWon' }
  | { type: 'CLEAR_PENDING_TACTIC' }
  | { type: 'SET_PENDING_TACTIC'; card: Card; flagIndex: number }
  | { type: 'CANCEL_REDEPLOY' }
  | { type: 'REDEPLOY_CARD'; sourceFlagIndex: number; cardIndex: number; destinationFlagIndex: number }
  | { type: 'DESERTER_DISCARD'; card: Card; flagIndex: number }
  | { type: 'TRAITOR_CAPTURE'; card: Card; flagIndex: number }
  | { type: 'TRAITOR_PLACE'; toFlagIndex: number }
  | { type: 'RESET_GAME' };

export function reducer(state: FullGameState, action: GameAction): FullGameState {
  const newState = structuredClone(state);

  switch (action.type) {
    case 'SELECT_CARD':
      newState.selectedCard = action.card;
      return newState;

    case 'SELECT_FLAG':
      newState.selectedFlag = action.flagIndex;
      return newState;

    case 'PLAY_CARD': {
      const { flagIndex, card, player = 'player' } = action;
      const flag = newState.flags[flagIndex];

      // Prevent overfilling or placing on completed flags
      if (flag.formation[player].cards.length >= 3 || flag.winner) return newState;

      // Add card to correct side
      flag.formation[player].cards.push(card);

      // Remove card from hand
      if (player === 'player') {
        newState.playerHand = newState.playerHand.filter(c => c.id !== card.id);
      } else {
        newState.opponentHand = newState.opponentHand.filter(c => c.id !== card.id);
      }

      // Only check for winner if player played the card (optional: also for opponent if needed)
      const winner = checkWinner(flag, newState.deck, newState.opponentHand);
      if (winner) {
        flag.winner = winner;
      }

      const gameWinner = checkGameOver(newState.flags);
      if (gameWinner) {
        newState.gameStatus = gameWinner === 'player' ? 'playerWon' : 'opponentWon';
      }

      return newState;
    }


    case 'DRAW_CARD': {
      const isOpponent = action.player === 'opponent';

      if (action.deckType === 'troop') {
        const [card, ...rest] = newState.deck;
        if (card) {
          newState.deck = rest;
          if (isOpponent) {
            newState.opponentHand.push(card);
          } else {
            newState.playerHand.push(card);
          }
        }
      } else {
        const [card, ...rest] = newState.tacticsDeck;
        if (card) {
          newState.tacticsDeck = rest;
          if (isOpponent) {
            newState.opponentHand.push(card); // Adjust this if opponent can't use tactics
          } else {
            newState.playerHand.push(card);
            newState.playerTacticsPlayed += 1;
          }
        }
      }

      return newState;
    }


    case 'START_SCOUT':
      newState.scoutDrawStep = {
        drawn: [],
        remaining: 3,
      };
      return newState;

    case 'SCOUT_DRAW': {
      if (!newState.scoutDrawStep || newState.scoutDrawStep.remaining <= 0) return newState;

      const deckToUse = action.from === 'troop' ? newState.deck : newState.tacticsDeck;
      const [card, ...rest] = deckToUse;

      if (!card) return newState;

      if (action.from === 'troop') {
        newState.deck = rest;
      } else {
        newState.tacticsDeck = rest;
      }

      newState.scoutDrawStep.drawn.push(card);
      newState.scoutDrawStep.remaining -= 1;

      return newState;
    }

    case 'SCOUT_PICK':
      if (!newState.scoutDrawStep) return newState;

      newState.scoutDrawStep.keep = action.chosen;
      newState.scoutDrawStep.discards = newState.scoutDrawStep.drawn.filter(c => c.id !== action.chosen.id);
      newState.playerHand.push(action.chosen);
      newState.playerTacticsPlayed += 1;

      return newState;

    case 'SCOUT_DISCARD_ORDER':
      if (!newState.scoutDrawStep?.discards) return newState;

      const [first, second] = action.discards;

      if (first.type === 'troop') newState.deck.unshift(second, first);
      else newState.tacticsDeck.unshift(second, first);

      newState.scoutDrawStep = null;
      return newState;

    case 'APPLY_TACTIC': {
      const flag = newState.flags[action.flagIndex];

      if (action.card.name === 'Fog' && !flag.modifiers.includes('fog')) {
        flag.modifiers.push('fog');
      }

      if (action.card.name === 'Mud' && !flag.modifiers.includes('mud')) {
        flag.modifiers.push('mud');
      }

      if (action.card.name === 'Scout') {
        newState.scoutDrawStep = {
          drawn: [],
          remaining: 3,
        };
      }

      if (action.card.name === 'Deserter') {
        newState.deserterActive = true;
      }

      if (action.card.name === 'Traitor') {
        newState.traitorActive = true;
      }

      if (action.card.name === 'Redeploy') {
        newState.redeployState = true;
      }

      return newState;
    }

    case 'SET_PENDING_TACTIC':
      newState.pendingTactics = {
        card: action.card,
        flagIndex: action.flagIndex,
      };
      return newState;

    case 'CLEAR_PENDING_TACTIC':
      newState.pendingTactics = null;
      return newState;

    case 'SET_GAME_STATUS':
      newState.gameStatus = action.status;
      return newState;

    case 'CANCEL_REDEPLOY':
      newState.redeployState = false;
      return newState;

    case 'REDEPLOY_CARD': {
      const card = newState.flags[action.sourceFlagIndex].formation.player.cards.splice(action.cardIndex, 1)[0];
      newState.flags[action.destinationFlagIndex].formation.player.cards.push(card);
      newState.redeployState = false;
      return newState;
    }

    case 'DESERTER_DISCARD':
      newState.flags[action.flagIndex].formation.opponent.cards = newState.flags[action.flagIndex].formation.opponent.cards.filter(
        c => c.id !== action.card.id
      );
      newState.deserterActive = false;
      return newState;

    case 'TRAITOR_CAPTURE':
      newState.pendingTraitor = {
        card: action.card,
        fromFlag: action.flagIndex,
      };
      newState.traitorActive = false;
      return newState;

    case 'TRAITOR_PLACE': {
      const { card, fromFlag } = newState.pendingTraitor || {};
      if (!card && fromFlag === undefined) return newState;
      const sourceFlag = newState.flags[fromFlag!];
      const targetFlag = newState.flags[action.toFlagIndex];
      sourceFlag.formation.opponent.cards = sourceFlag.formation.opponent.cards.filter(c => c.id !== card!.id);
      targetFlag.formation.player.cards.push(card!);
      newState.pendingTraitor = null;
      return newState;
    }
    case 'RESET_GAME': {
      return createInitialState();
    }

    default:
      return newState;
  }
}
