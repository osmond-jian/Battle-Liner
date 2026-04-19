/**
 * Tactic action handlers for the game reducer.
 *
 * Each function receives a structuredClone of the state (already copied by the
 * reducer) and mutates it in place, then returns it.  The reducer delegates
 * directly to these so the switch statement stays concise.
 */

import type { Card, GameState } from '../types/game';
import { checkWinner, checkGameOver } from '../utils/gameLogic';

// ── Shared helpers ────────────────────────────────────────────────────────────

/**
 * Checks whether `flag` now has a winner, and whether that tips the game.
 * Mutates `newState` in place.
 */
export function applyFlagWinnerCheck(newState: GameState, flagIndex: number): void {
  const flag = newState.flags[flagIndex];
  const winner = checkWinner(flag, newState.deck, newState.opponentHand, newState.playerHand);
  if (winner) flag.winner = winner;
  const gameWinner = checkGameOver(newState.flags);
  if (gameWinner) newState.gameStatus = gameWinner === 'player' ? 'playerWon' : 'opponentWon';
}

// ── APPLY_TACTIC ──────────────────────────────────────────────────────────────

export function handleApplyTactic(
  newState: GameState,
  card: Card,
  flagIndex: number,
  player: 'player' | 'opponent' = 'player',
): GameState {
  const flag = newState.flags[flagIndex];

  // Fog and Mud cannot be applied to already-won flags.
  if (flag.winner && (card.name === 'Fog' || card.name === 'Mud')) {
    return newState;
  }

  if (player === 'player') {
    newState.playerHand = newState.playerHand.filter(c => c.id !== card.id);
    newState.playerTacticsPlayed += 1;
    newState.playerPlayedTactics.push(card);
  } else {
    newState.opponentHand = newState.opponentHand.filter(c => c.id !== card.id);
    newState.opponentTacticsPlayed += 1;
    newState.opponentPlayedTactics.push(card);
  }
  {
    const onFlag = ['Fog', 'Mud', 'Leader', 'Companion Cavalry', 'Shield Bearers'].includes(card.name ?? '');
    const extra =
      card.name === 'Scout'    ? ' — drew 3 extra cards' :
      card.name === 'Deserter' ? ' — removed a played card' :
      card.name === 'Traitor'  ? ' — stole a troop card' :
      card.name === 'Redeploy' ? ' — repositioned a troop' : '';
    const moveRecord = {
      summary: `Played ${card.name ?? 'tactic'}${onFlag ? ` on Flag ${flagIndex + 1}` : ''}${extra}`,
    };
    if (player === 'opponent') newState.lastOpponentMove = moveRecord;
    else newState.lastPlayerMove = moveRecord;
  }

  switch (card.name) {
    case 'Fog':
      if (!flag.modifiers.includes('fog')) flag.modifiers.push('fog');
      break;

    case 'Mud':
      if (!flag.modifiers.includes('mud')) flag.modifiers.push('mud');
      break;

    case 'Scout':
      newState.scoutDrawStep = { drawn: [], remaining: 3 };
      break;

    case 'Deserter':
      newState.deserterActive = true;
      newState.pendingTactics = { card, flagIndex };
      break;

    case 'Traitor':
      newState.traitorActive = true;
      newState.pendingTactics = { card, flagIndex };
      break;

    case 'Redeploy':
      newState.redeployState = true;
      newState.pendingTactics = { card, flagIndex };
      break;

    case 'Leader':
      newState.leaderPending = { card, flagIndex };
      return newState;

    case 'Companion Cavalry':
      newState.companionPending = { card, flagIndex };
      return newState;

    case 'Shield Bearers':
      newState.shieldPending = { card, flagIndex };
      return newState;

    default:
      break;
  }

  return newState;
}

// ── Wild-card placement (Leader / Companion Cavalry / Shield Bearers) ─────────

/**
 * Common logic for SET_LEADER_CARD, SET_COMPANION_CARD, SET_SHIELD_BEARERS_CARD.
 * Pulls the pending entry off state, places the configured card on the flag,
 * then runs the winner check.
 */
export function handleSetWildCard(
  newState: GameState,
  pending: { card: Card; flagIndex: number } | undefined,
  clearPending: (s: GameState) => void,
  color: Card['color'],
  value: Card['value'],
): GameState {
  if (!pending) return newState;

  const modifiedCard = { ...pending.card, color, value };
  const flag = newState.flags[pending.flagIndex];
  flag.formation.player.cards.push(modifiedCard);
  clearPending(newState);
  newState.pendingTactics = null;

  applyFlagWinnerCheck(newState, pending.flagIndex);
  return newState;
}
