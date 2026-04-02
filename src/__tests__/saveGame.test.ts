import { describe, it, expect, beforeEach, vi } from 'vitest';
import { encodeCard, decodeCard, hasSave, getSaveDate, saveGame, loadGame } from '../utils/saveGame';
import { troop } from './helpers';
import { createInitialState } from '../engine/initialState';
import type { Card } from '../types/game';

// ─── localStorage mock ────────────────────────────────────────────────────────

// jsdom provides localStorage; clear it between tests.
beforeEach(() => {
  localStorage.clear();
});

// ─── encodeCard ───────────────────────────────────────────────────────────────

describe('encodeCard', () => {
  it('encodes a troop card as its id', () => {
    expect(encodeCard(troop('red', 5))).toBe('red-5');
    expect(encodeCard(troop('yellow', 10))).toBe('yellow-10');
  });

  it('encodes a raw (unconfigured) tactic card as its id', () => {
    const rawTactic: Card = { id: 't1', type: 'tactic', name: 'Leader', effect: 'wild', value: 0 };
    expect(encodeCard(rawTactic)).toBe('t1');
  });

  it('encodes a configured tactic card as "{id}:{colorChar}{value}"', () => {
    const configured: Card = {
      id: 't1', type: 'tactic', name: 'Leader', effect: 'wild', color: 'red', value: 7,
    };
    expect(encodeCard(configured)).toBe('t1:r7');
  });

  it('uses the correct single-character color codes', () => {
    const pairs: [import('../types/game').CardColor, string][] = [
      ['red', 'r'], ['blue', 'b'], ['green', 'g'],
      ['orange', 'o'], ['purple', 'p'], ['yellow', 'y'],
    ];
    for (const [color, char] of pairs) {
      const card: Card = { id: 't1', type: 'tactic', name: 'Leader', effect: 'wild', color, value: 5 };
      expect(encodeCard(card)).toBe(`t1:${char}5`);
    }
  });
});

// ─── decodeCard ───────────────────────────────────────────────────────────────

describe('decodeCard', () => {
  it('decodes a troop card string back to a full Card', () => {
    const card = decodeCard('blue-3');
    expect(card.type).toBe('troop');
    expect(card.color).toBe('blue');
    expect(card.value).toBe(3);
    expect(card.id).toBe('blue-3');
  });

  it('decodes a raw tactic card by id', () => {
    const card = decodeCard('t7'); // Scout
    expect(card.type).toBe('tactic');
    expect(card.id).toBe('t7');
    expect(card.name).toBe('Scout');
  });

  it('decodes a configured tactic card with color and value', () => {
    const card = decodeCard('t1:r7');
    expect(card.id).toBe('t1');
    expect(card.color).toBe('red');
    expect(card.value).toBe(7);
  });

  it('throws for an unknown tactic id', () => {
    expect(() => decodeCard('t99')).toThrow();
  });

  it('round-trips: encode then decode returns equivalent card (troop)', () => {
    const original = troop('green', 8);
    const decoded = decodeCard(encodeCard(original));
    expect(decoded.id).toBe(original.id);
    expect(decoded.color).toBe(original.color);
    expect(decoded.value).toBe(original.value);
    expect(decoded.type).toBe(original.type);
  });

  it('round-trips: encode then decode returns equivalent card (configured tactic)', () => {
    const configured: Card = { id: 't3', type: 'tactic', name: 'Companion Cavalry', effect: 'value8', color: 'purple', value: 8 };
    const decoded = decodeCard(encodeCard(configured));
    expect(decoded.id).toBe('t3');
    expect(decoded.color).toBe('purple');
    expect(decoded.value).toBe(8);
  });
});

// ─── hasSave ─────────────────────────────────────────────────────────────────

describe('hasSave', () => {
  it('returns false when localStorage is empty', () => {
    expect(hasSave()).toBe(false);
  });

  it('returns true after a save is written', () => {
    const state = createInitialState();
    saveGame(state, 'player');
    expect(hasSave()).toBe(true);
  });
});

// ─── getSaveDate ─────────────────────────────────────────────────────────────

describe('getSaveDate', () => {
  it('returns null when there is no save', () => {
    expect(getSaveDate()).toBeNull();
  });

  it('returns a Date object after saving', () => {
    const state = createInitialState();
    const before = Date.now();
    saveGame(state, 'player');
    const date = getSaveDate();
    expect(date).toBeInstanceOf(Date);
    expect(date!.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('returns null when localStorage contains invalid JSON', () => {
    localStorage.setItem('battleline-save', 'not-valid-json{{{');
    expect(getSaveDate()).toBeNull();
  });
});

// ─── saveGame / loadGame round-trip ──────────────────────────────────────────

describe('saveGame + loadGame', () => {
  it('loadGame returns null when there is no save', () => {
    expect(loadGame()).toBeNull();
  });

  it('round-trips a fresh initial state', () => {
    const original = createInitialState();
    saveGame(original, 'player');
    const loaded = loadGame();

    expect(loaded).not.toBeNull();
    expect(loaded!.turnPhase).toBe('player');
    expect(loaded!.gameState.playerHand).toHaveLength(original.playerHand.length);
    expect(loaded!.gameState.deck).toHaveLength(original.deck.length);
    expect(loaded!.gameState.tacticsDeck).toHaveLength(original.tacticsDeck.length);
    expect(loaded!.gameState.flags).toHaveLength(9);
    expect(loaded!.gameState.gameStatus).toBe('playing');
  });

  it('preserves turn phase (awaitingDraw)', () => {
    const state = createInitialState();
    saveGame(state, 'awaitingDraw');
    expect(loadGame()!.turnPhase).toBe('awaitingDraw');
  });

  it('preserves flag modifiers and winners', () => {
    const state = createInitialState();
    state.flags[2].modifiers = ['fog', 'mud'];
    state.flags[4].winner = 'opponent';
    saveGame(state, 'player');
    const { gameState } = loadGame()!;
    expect(gameState.flags[2].modifiers).toEqual(['fog', 'mud']);
    expect(gameState.flags[4].winner).toBe('opponent');
  });

  it('preserves cards played onto flags', () => {
    const state = createInitialState();
    const card = state.playerHand[0];
    state.flags[0].formation.player.cards.push(card);
    state.playerHand = state.playerHand.slice(1);
    saveGame(state, 'player');
    const { gameState } = loadGame()!;
    expect(gameState.flags[0].formation.player.cards[0].id).toBe(card.id);
  });

  it('preserves playerTacticsPlayed counter', () => {
    const state = createInitialState();
    state.playerTacticsPlayed = 3;
    saveGame(state, 'player');
    expect(loadGame()!.gameState.playerTacticsPlayed).toBe(3);
  });

  it('returns null for a save with a mismatched version', () => {
    localStorage.setItem(
      'battleline-save',
      JSON.stringify({ version: 999, savedAt: new Date().toISOString() }),
    );
    expect(loadGame()).toBeNull();
  });

  it('preserves savedAt as a Date', () => {
    const state = createInitialState();
    const before = Date.now();
    saveGame(state, 'player');
    const loaded = loadGame();
    expect(loaded!.savedAt).toBeInstanceOf(Date);
    expect(loaded!.savedAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});
