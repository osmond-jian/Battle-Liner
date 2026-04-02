import { Card, Flag, GameState } from '../types/game';
import { createInitialState } from '../engine/initialState'
import { getSlotCount } from '../utils/gameLogic';
import { applyFlagWinnerCheck, handleApplyTactic, handleSetWildCard } from './tacticHandlers';

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
  | { type: 'RESET_GAME' }
  | { type: 'SET_LEADER_CARD'; color: Card['color']; value: Card['value'] }
  | { type: 'SET_COMPANION_CARD'; color: Card['color']; value: Card['value'] }
  | { type: 'SET_SHIELD_BEARERS_CARD'; color: Card['color']; value: Card['value'] }
  | { type: 'CANCEL_TACTIC_CONFIG' }
  | { type: 'REDEPLOY_DISCARD'; sourceFlagIndex: number; cardIndex: number }
  | { type: 'REORDER_HAND'; fromId: string; toId: string }
  | { type: 'SORT_HAND'; mode: 'value' | 'color' };


export function reducer(state: GameState, action: GameAction): GameState {
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
      const required = getSlotCount(flag);
      if (flag.formation[player].cards.length >= required || flag.winner) return newState;

      // Add card to correct side
      flag.formation[player].cards.push(card);

      // Remove card from hand
      if (player === 'player') {
        newState.playerHand = newState.playerHand.filter(c => c.id !== card.id);
      } else {
        newState.opponentHand = newState.opponentHand.filter(c => c.id !== card.id);
      }

      applyFlagWinnerCheck(newState, flagIndex);
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
      // Do NOT increment playerTacticsPlayed here — picking a card from the Scout
      // draw is not playing a new tactic. The counter was incremented when Scout
      // was played via APPLY_TACTIC.

      return newState;

    case 'SCOUT_DISCARD_ORDER':
      if (!newState.scoutDrawStep?.discards) return newState;

      const [first, second] = action.discards;

      if (first.type === 'troop') newState.deck.unshift(second, first);
      else newState.tacticsDeck.unshift(second, first);

      newState.scoutDrawStep = null;
      return newState;

    case 'APPLY_TACTIC':
      return handleApplyTactic(newState, action.card, action.flagIndex);


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
      const destFlag = newState.flags[action.destinationFlagIndex];
      const destSlots = getSlotCount(destFlag);
      if (destFlag.winner || destFlag.formation.player.cards.length >= destSlots) return newState;
      const card = newState.flags[action.sourceFlagIndex].formation.player.cards.splice(action.cardIndex, 1)[0];
      destFlag.formation.player.cards.push(card);
      newState.redeployState = false;
      newState.pendingTactics = null;
      return newState;
    }

    case 'DESERTER_DISCARD':
      newState.flags[action.flagIndex].formation.opponent.cards = newState.flags[action.flagIndex].formation.opponent.cards.filter(
        c => c.id !== action.card.id
      );
      newState.deserterActive = false;
      newState.pendingTactics = null;
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
      newState.pendingTactics = null;
      applyFlagWinnerCheck(newState, action.toFlagIndex);
      return newState;
    }
    case 'RESET_GAME': {
      return createInitialState();
    }

    case 'SET_LEADER_CARD':
      return handleSetWildCard(newState, newState.leaderPending, s => { s.leaderPending = undefined; }, action.color, action.value);

    case 'SET_COMPANION_CARD':
      return handleSetWildCard(newState, newState.companionPending, s => { s.companionPending = undefined; }, action.color, action.value);

    case 'SET_SHIELD_BEARERS_CARD':
      return handleSetWildCard(newState, newState.shieldPending, s => { s.shieldPending = undefined; }, action.color, action.value);

    case 'CANCEL_TACTIC_CONFIG':
      // Clears all wild-card pending states so their modals dismiss.
      newState.leaderPending = undefined;
      newState.companionPending = undefined;
      newState.shieldPending = undefined;
      newState.pendingTactics = null;
      return newState;

    case 'REDEPLOY_DISCARD': {
      const card = newState.flags[action.sourceFlagIndex].formation.player.cards.splice(action.cardIndex, 1)[0];
      if (card) {
        // Return to the bottom of the appropriate deck.
        if (card.type === 'tactic') {
          newState.tacticsDeck.push(card);
        } else {
          newState.deck.push(card);
        }
      }
      newState.redeployState = false;
      newState.pendingTactics = null;
      return newState;
    }


    case 'REORDER_HAND': {
      const fi = newState.playerHand.findIndex(c => c.id === action.fromId);
      const ti = newState.playerHand.findIndex(c => c.id === action.toId);
      if (fi >= 0 && ti >= 0) {
        [newState.playerHand[fi], newState.playerHand[ti]] =
          [newState.playerHand[ti], newState.playerHand[fi]];
      }
      return newState;
    }

    case 'SORT_HAND': {
      const colorOrder = ['red', 'blue', 'green', 'orange', 'purple', 'yellow'];
      const troops  = newState.playerHand.filter(c => c.type === 'troop');
      const tactics = newState.playerHand.filter(c => c.type === 'tactic');
      if (action.mode === 'value') {
        troops.sort((a, b) => (a.value ?? 0) - (b.value ?? 0));
      } else {
        troops.sort((a, b) => {
          const ci = colorOrder.indexOf(a.color ?? '');
          const cj = colorOrder.indexOf(b.color ?? '');
          return ci !== cj ? ci - cj : (a.value ?? 0) - (b.value ?? 0);
        });
      }
      newState.playerHand = [...troops, ...tactics];
      return newState;
    }

    default:
      return newState;
  }
}
