/**
 * Shared test factories for cards, flags, and game state.
 */

import type { Card, CardColor, CardValue, Flag, GameState } from '../types/game';
import { createFlags } from '../utils/gameLogic';

export function troop(color: CardColor, value: CardValue): Card {
  return { id: `${color}-${value}`, type: 'troop', color, value, name: 'none', effect: 'none' };
}

export function tactic(id: string, name: string, effect: string, value: CardValue = 0): Card {
  return { id, type: 'tactic', name, effect, color: undefined, value };
}

export function makeFlag(
  playerCards: Card[] = [],
  opponentCards: Card[] = [],
  modifiers: string[] = [],
  winner: 'player' | 'opponent' | null = null,
): Flag {
  return {
    id: 1,
    formation: {
      player: { cards: playerCards, owner: null },
      opponent: { cards: opponentCards, owner: null },
    },
    modifiers,
    winner,
  };
}

/** Minimal GameState — only populate what the test needs. */
export function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    gameStatus: 'playing',
    playerHand: [],
    opponentHand: [],
    deck: [],
    tacticsDeck: [],
    flags: createFlags(),
    selectedCard: null,
    selectedFlag: null,
    playerTacticsPlayed: 0,
    opponentTacticsPlayed: 0,
    deserterActive: false,
    traitorActive: false,
    redeployState: false,
    pendingTactics: null,
    pendingTraitor: null,
    scoutDrawStep: null,
    ...overrides,
  };
}
