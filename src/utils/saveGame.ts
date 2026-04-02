import type { Card, CardColor, CardValue, GameState } from '../types/game';
import type { TurnPhase } from '../types/game';
import { createTacticsDeck } from '../data/tacticCards';

const STORAGE_KEY = 'battleline-save';
const SAVE_VERSION = 1 as const;

// ── Card codec (exported so urlGameState.ts can reuse) ────────────────────

const COLOR_TO_CHAR: Record<string, string> = {
  red: 'r', blue: 'b', green: 'g', orange: 'o', purple: 'p', yellow: 'y',
};
const CHAR_TO_COLOR: Record<string, CardColor> = {
  r: 'red', b: 'blue', g: 'green', o: 'orange', p: 'purple', y: 'yellow',
};

// Build a lookup table from the canonical tactic deck (id → base card object).
const TACTIC_MASTER: Record<string, Card> = Object.fromEntries(
  createTacticsDeck().map(c => [c.id, { ...c }])
);

/**
 * Encodes a Card to a compact string:
 *   Troop:                card.id          e.g.  "red-5"
 *   Tactic (raw):         card.id          e.g.  "t1"
 *   Tactic (configured):  "{id}:{c}{v}"   e.g.  "t1:r7"
 */
export function encodeCard(card: Card): string {
  if (card.type === 'troop') return card.id;
  if (card.color && card.value) {
    return `${card.id}:${COLOR_TO_CHAR[card.color]}${card.value}`;
  }
  return card.id;
}

/**
 * Decodes a compact string back to a Card object with all fields populated.
 */
export function decodeCard(encoded: string): Card {
  if (encoded.startsWith('t')) {
    const [id, config] = encoded.split(':');
    const base = TACTIC_MASTER[id];
    if (!base) throw new Error(`Unknown tactic id: ${id}`);
    if (config) {
      const color = CHAR_TO_COLOR[config[0]];
      const value = parseInt(config.slice(1)) as CardValue;
      return { ...base, color, value };
    }
    return { ...base };
  }
  // Troop — id is already "color-value"
  const dash = encoded.indexOf('-');
  const color = encoded.slice(0, dash) as CardColor;
  const value = parseInt(encoded.slice(dash + 1)) as CardValue;
  return { id: encoded, type: 'troop', color, value, name: 'none', effect: 'none' };
}

// ── Save slot schema ───────────────────────────────────────────────────────

interface SaveSlot {
  version: typeof SAVE_VERSION;
  savedAt: string;
  turnPhase: TurnPhase;
  deck: string[];
  tacticsDeck: string[];
  playerHand: string[];
  opponentHand: string[];
  flags: {
    playerCards: string[];
    opponentCards: string[];
    modifiers: string[];
    winner: 'player' | 'opponent' | null;
  }[];
  playerTacticsPlayed: number;
  opponentTacticsPlayed: number;
  gameStatus: string;
  deserterActive: boolean;
  traitorActive: boolean;
  redeployState: boolean;
  pendingTactics: { card: string; flagIndex: number } | null;
  pendingTraitor: { card: string; fromFlag: number } | null;
  leaderPending?: { card: string; flagIndex: number };
  companionPending?: { card: string; flagIndex: number };
  shieldPending?: { card: string; flagIndex: number };
  scoutDrawStep: {
    drawn: string[];
    remaining: number;
    keep?: string;
    discards?: string[];
  } | null;
}

// ── Public API ─────────────────────────────────────────────────────────────

export interface LoadedSave {
  gameState: GameState;
  turnPhase: TurnPhase;
  savedAt: Date;
}

export function hasSave(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

export function getSaveDate(): Date | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const slot = JSON.parse(raw) as SaveSlot;
    return new Date(slot.savedAt);
  } catch {
    return null;
  }
}

export function saveGame(gameState: GameState, turnPhase: TurnPhase): void {
  const enc = encodeCard;
  const slot: SaveSlot = {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    turnPhase,
    deck: gameState.deck.map(enc),
    tacticsDeck: gameState.tacticsDeck.map(enc),
    playerHand: gameState.playerHand.map(enc),
    opponentHand: gameState.opponentHand.map(enc),
    flags: gameState.flags.map(f => ({
      playerCards: f.formation.player.cards.map(enc),
      opponentCards: f.formation.opponent.cards.map(enc),
      modifiers: [...f.modifiers],
      winner: f.winner,
    })),
    playerTacticsPlayed: gameState.playerTacticsPlayed,
    opponentTacticsPlayed: gameState.opponentTacticsPlayed,
    gameStatus: gameState.gameStatus,
    deserterActive: gameState.deserterActive,
    traitorActive: gameState.traitorActive,
    redeployState: gameState.redeployState,
    pendingTactics: gameState.pendingTactics
      ? { card: enc(gameState.pendingTactics.card), flagIndex: gameState.pendingTactics.flagIndex }
      : null,
    pendingTraitor: gameState.pendingTraitor
      ? { card: enc(gameState.pendingTraitor.card), fromFlag: gameState.pendingTraitor.fromFlag }
      : null,
    leaderPending: gameState.leaderPending
      ? { card: enc(gameState.leaderPending.card), flagIndex: gameState.leaderPending.flagIndex }
      : undefined,
    companionPending: gameState.companionPending
      ? { card: enc(gameState.companionPending.card), flagIndex: gameState.companionPending.flagIndex }
      : undefined,
    shieldPending: gameState.shieldPending
      ? { card: enc(gameState.shieldPending.card), flagIndex: gameState.shieldPending.flagIndex }
      : undefined,
    scoutDrawStep: gameState.scoutDrawStep
      ? {
          drawn: gameState.scoutDrawStep.drawn.map(enc),
          remaining: gameState.scoutDrawStep.remaining,
          keep: gameState.scoutDrawStep.keep ? enc(gameState.scoutDrawStep.keep) : undefined,
          discards: gameState.scoutDrawStep.discards?.map(enc),
        }
      : null,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slot));
}

export function loadGame(): LoadedSave | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const slot = JSON.parse(raw) as SaveSlot;
    if (slot.version !== SAVE_VERSION) return null;
    const dec = decodeCard;
    const gameState: GameState = {
      deck: slot.deck.map(dec),
      tacticsDeck: slot.tacticsDeck.map(dec),
      playerHand: slot.playerHand.map(dec),
      opponentHand: slot.opponentHand.map(dec),
      flags: slot.flags.map((f, i) => ({
        id: i + 1,
        formation: {
          player: { cards: f.playerCards.map(dec), owner: null },
          opponent: { cards: f.opponentCards.map(dec), owner: null },
        },
        modifiers: f.modifiers,
        winner: f.winner,
      })),
      playerTacticsPlayed: slot.playerTacticsPlayed,
      opponentTacticsPlayed: slot.opponentTacticsPlayed,
      gameStatus: slot.gameStatus as GameState['gameStatus'],
      selectedCard: null,
      selectedFlag: null,
      deserterActive: slot.deserterActive,
      traitorActive: slot.traitorActive,
      redeployState: slot.redeployState,
      pendingTactics: slot.pendingTactics
        ? { card: dec(slot.pendingTactics.card), flagIndex: slot.pendingTactics.flagIndex }
        : null,
      pendingTraitor: slot.pendingTraitor
        ? { card: dec(slot.pendingTraitor.card), fromFlag: slot.pendingTraitor.fromFlag }
        : null,
      leaderPending: slot.leaderPending
        ? { card: dec(slot.leaderPending.card), flagIndex: slot.leaderPending.flagIndex }
        : undefined,
      companionPending: slot.companionPending
        ? { card: dec(slot.companionPending.card), flagIndex: slot.companionPending.flagIndex }
        : undefined,
      shieldPending: slot.shieldPending
        ? { card: dec(slot.shieldPending.card), flagIndex: slot.shieldPending.flagIndex }
        : undefined,
      scoutDrawStep: slot.scoutDrawStep
        ? {
            drawn: slot.scoutDrawStep.drawn.map(dec),
            remaining: slot.scoutDrawStep.remaining,
            keep: slot.scoutDrawStep.keep ? dec(slot.scoutDrawStep.keep) : undefined,
            discards: slot.scoutDrawStep.discards?.map(dec),
          }
        : null,
    };
    return { gameState, turnPhase: slot.turnPhase, savedAt: new Date(slot.savedAt) };
  } catch {
    return null;
  }
}
