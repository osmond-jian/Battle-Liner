import { describe, it, expect } from 'vitest';
import { reducer } from '../engine/gameEngine';
import { createInitialState } from '../engine/initialState';
import { troop, tactic, makeFlag, makeState } from './helpers';
import { createFlags } from '../utils/gameLogic';
import type { GameState } from '../types/game';

// ─── SELECT_CARD / SELECT_FLAG ────────────────────────────────────────────────

describe('SELECT_CARD', () => {
  it('sets selectedCard', () => {
    const state = createInitialState();
    const card = state.playerHand[0];
    const next = reducer(state, { type: 'SELECT_CARD', card });
    expect(next.selectedCard?.id).toBe(card.id);
  });

  it('clears selectedCard when passed null', () => {
    const state = createInitialState();
    const withCard = reducer(state, { type: 'SELECT_CARD', card: state.playerHand[0] });
    const cleared = reducer(withCard, { type: 'SELECT_CARD', card: null });
    expect(cleared.selectedCard).toBeNull();
  });
});

describe('SELECT_FLAG', () => {
  it('sets selectedFlag', () => {
    const state = createInitialState();
    const next = reducer(state, { type: 'SELECT_FLAG', flagIndex: 4 });
    expect(next.selectedFlag).toBe(4);
  });

  it('clears selectedFlag when passed null', () => {
    const state = createInitialState();
    const withFlag = reducer(state, { type: 'SELECT_FLAG', flagIndex: 3 });
    const cleared = reducer(withFlag, { type: 'SELECT_FLAG', flagIndex: null });
    expect(cleared.selectedFlag).toBeNull();
  });
});

// ─── PLAY_CARD ────────────────────────────────────────────────────────────────

describe('PLAY_CARD', () => {
  it('adds the card to the flag and removes it from the player hand', () => {
    const state = createInitialState();
    const card = state.playerHand[0];
    const next = reducer(state, { type: 'PLAY_CARD', card, flagIndex: 0, player: 'player' });
    expect(next.flags[0].formation.player.cards.map(c => c.id)).toContain(card.id);
    expect(next.playerHand.map(c => c.id)).not.toContain(card.id);
  });

  it('adds the card to the opponent side when player is "opponent"', () => {
    const state = createInitialState();
    const card = state.opponentHand[0];
    const next = reducer(state, { type: 'PLAY_CARD', card, flagIndex: 1, player: 'opponent' });
    expect(next.flags[1].formation.opponent.cards.map(c => c.id)).toContain(card.id);
    expect(next.opponentHand.map(c => c.id)).not.toContain(card.id);
  });

  it('does not modify state if the flag is already won', () => {
    const state = createInitialState();
    state.flags[0].winner = 'opponent';
    const card = state.playerHand[0];
    const next = reducer(state, { type: 'PLAY_CARD', card, flagIndex: 0, player: 'player' });
    expect(next.flags[0].formation.player.cards).toHaveLength(0);
    expect(next.playerHand.map(c => c.id)).toContain(card.id);
  });

  it('does not overfill a flag (rejects the 4th card on a normal flag)', () => {
    const flags = createFlags();
    flags[0].formation.player.cards = [
      troop('red', 1), troop('red', 2), troop('red', 3),
    ];
    const extraCard = troop('red', 4);
    const state = makeState({
      flags,
      playerHand: [extraCard],
    });
    const next = reducer(state, { type: 'PLAY_CARD', card: extraCard, flagIndex: 0, player: 'player' });
    expect(next.flags[0].formation.player.cards).toHaveLength(3);
  });

  it('allows a 4th card on a flag with the mud modifier', () => {
    const flags = createFlags();
    flags[0].modifiers = ['mud'];
    flags[0].formation.player.cards = [
      troop('red', 1), troop('red', 2), troop('red', 3),
    ];
    const fourthCard = troop('red', 4);
    const state = makeState({ flags, playerHand: [fourthCard] });
    const next = reducer(state, { type: 'PLAY_CARD', card: fourthCard, flagIndex: 0, player: 'player' });
    expect(next.flags[0].formation.player.cards).toHaveLength(4);
  });

  it('does not mutate the original state', () => {
    const state = createInitialState();
    const handLengthBefore = state.playerHand.length;
    reducer(state, { type: 'PLAY_CARD', card: state.playerHand[0], flagIndex: 0, player: 'player' });
    expect(state.playerHand).toHaveLength(handLengthBefore);
  });
});

// ─── DRAW_CARD ────────────────────────────────────────────────────────────────

describe('DRAW_CARD', () => {
  it('draws the top troop card into the player hand', () => {
    const state = createInitialState();
    const topCard = state.deck[0];
    const next = reducer(state, { type: 'DRAW_CARD', deckType: 'troop', player: 'player' });
    expect(next.playerHand.map(c => c.id)).toContain(topCard.id);
    expect(next.deck).toHaveLength(state.deck.length - 1);
  });

  it('draws the top tactic card into the player hand', () => {
    const state = createInitialState();
    const topTactic = state.tacticsDeck[0];
    const next = reducer(state, { type: 'DRAW_CARD', deckType: 'tactic', player: 'player' });
    expect(next.playerHand.map(c => c.id)).toContain(topTactic.id);
    expect(next.tacticsDeck).toHaveLength(state.tacticsDeck.length - 1);
  });

  it('draws into the opponent hand when player is "opponent"', () => {
    const state = createInitialState();
    const topCard = state.deck[0];
    const next = reducer(state, { type: 'DRAW_CARD', deckType: 'troop', player: 'opponent' });
    expect(next.opponentHand.map(c => c.id)).toContain(topCard.id);
  });

  it('does nothing when the troop deck is empty', () => {
    const state = makeState({ deck: [], playerHand: [troop('red', 1)] });
    const next = reducer(state, { type: 'DRAW_CARD', deckType: 'troop', player: 'player' });
    expect(next.playerHand).toHaveLength(1);
  });

  it('does NOT increment playerTacticsPlayed when drawing from tactic deck (drawing ≠ playing)', () => {
    const state = createInitialState();
    const before = state.playerTacticsPlayed;
    const next = reducer(state, { type: 'DRAW_CARD', deckType: 'tactic', player: 'player' });
    expect(next.playerTacticsPlayed).toBe(before);
  });

  it('does NOT increment playerTacticsPlayed when drawing a troop card', () => {
    const state = createInitialState();
    const before = state.playerTacticsPlayed;
    const next = reducer(state, { type: 'DRAW_CARD', deckType: 'troop', player: 'player' });
    expect(next.playerTacticsPlayed).toBe(before);
  });
});

// ─── SCOUT actions ────────────────────────────────────────────────────────────

describe('SCOUT_PICK', () => {
  it('adds chosen card to player hand', () => {
    const card = troop('red', 5);
    const state = makeState({
      scoutDrawStep: { drawn: [card, troop('blue', 3)], remaining: 0 },
      playerHand: [],
    });
    const next = reducer(state, { type: 'SCOUT_PICK', chosen: card });
    expect(next.playerHand.map(c => c.id)).toContain(card.id);
  });

  it('does NOT increment playerTacticsPlayed (counter was bumped when Scout was played)', () => {
    const card = troop('red', 5);
    const state = makeState({
      playerTacticsPlayed: 1, // already incremented by APPLY_TACTIC for Scout
      scoutDrawStep: { drawn: [card, troop('blue', 3)], remaining: 0 },
    });
    const next = reducer(state, { type: 'SCOUT_PICK', chosen: card });
    expect(next.playerTacticsPlayed).toBe(1);
  });

  it('sets discards to the unchosen cards', () => {
    const keep = troop('red', 5);
    const discard1 = troop('blue', 3);
    const discard2 = troop('green', 7);
    const state = makeState({
      scoutDrawStep: { drawn: [keep, discard1, discard2], remaining: 0 },
    });
    const next = reducer(state, { type: 'SCOUT_PICK', chosen: keep });
    expect(next.scoutDrawStep?.discards?.map(c => c.id)).toEqual(
      expect.arrayContaining([discard1.id, discard2.id]),
    );
  });
});

// ─── APPLY_TACTIC (delegation check) ─────────────────────────────────────────

describe('APPLY_TACTIC', () => {
  it('adds fog modifier to the flag', () => {
    const fogCard = tactic('t5', 'Fog', 'fog');
    const state = makeState({ playerHand: [fogCard] });
    const next = reducer(state, { type: 'APPLY_TACTIC', card: fogCard, flagIndex: 0 });
    expect(next.flags[0].modifiers).toContain('fog');
  });

  it('increments playerTacticsPlayed', () => {
    const fogCard = tactic('t5', 'Fog', 'fog');
    const state = makeState({ playerHand: [fogCard] });
    const next = reducer(state, { type: 'APPLY_TACTIC', card: fogCard, flagIndex: 0 });
    expect(next.playerTacticsPlayed).toBe(1);
  });

  it('increments opponentTacticsPlayed (not playerTacticsPlayed) when player is "opponent"', () => {
    // Bug regression: opponent tactic plays were dispatched as PLAY_CARD instead of
    // APPLY_TACTIC, so opponentTacticsPlayed was never incremented.  The tactics-lead
    // rule then incorrectly blocked the human player even though the opponent had
    // visually played a tactic on the board.
    const mudCard = tactic('t6', 'Mud', 'mud');
    const state = makeState({ opponentHand: [mudCard] });
    const next = reducer(state, { type: 'APPLY_TACTIC', card: mudCard, flagIndex: 0, player: 'opponent' });
    expect(next.opponentTacticsPlayed).toBe(1);
    expect(next.playerTacticsPlayed).toBe(0);
  });

  it('PLAY_CARD does NOT increment playerTacticsPlayed even for a tactic card', () => {
    // PLAY_CARD is the wrong dispatch for tactic cards — it bypasses the counter.
    // This test ensures that if a tactic card is accidentally dispatched via PLAY_CARD
    // (the original bug), the counter is not affected.
    const fogCard = tactic('t5', 'Fog', 'fog');
    const state = makeState({ playerHand: [fogCard] });
    const next = reducer(state, { type: 'PLAY_CARD', card: fogCard, flagIndex: 0, player: 'player' });
    expect(next.playerTacticsPlayed).toBe(0);
  });
});

// ─── CANCEL_TACTIC_CONFIG ─────────────────────────────────────────────────────

describe('CANCEL_TACTIC_CONFIG', () => {
  it('clears all pending wild-card states', () => {
    const leaderCard = tactic('t1', 'Leader', 'wild');
    const state = makeState({
      leaderPending: { card: leaderCard, flagIndex: 0 },
      pendingTactics: { card: leaderCard, flagIndex: 0 },
    });
    const next = reducer(state, { type: 'CANCEL_TACTIC_CONFIG' });
    expect(next.leaderPending).toBeUndefined();
    expect(next.companionPending).toBeUndefined();
    expect(next.shieldPending).toBeUndefined();
    expect(next.pendingTactics).toBeNull();
  });
});

// ─── SORT_HAND ────────────────────────────────────────────────────────────────

describe('SORT_HAND', () => {
  function stateWithHand(cards: GameState['playerHand']): GameState {
    return makeState({ playerHand: cards });
  }

  it('sorts troops by value ascending', () => {
    const state = stateWithHand([troop('red', 9), troop('blue', 1), troop('green', 5)]);
    const next = reducer(state, { type: 'SORT_HAND', mode: 'value' });
    const values = next.playerHand.map(c => c.value);
    expect(values).toEqual([1, 5, 9]);
  });

  it('sorts troops by color order (red first)', () => {
    const state = stateWithHand([troop('yellow', 5), troop('red', 5), troop('blue', 5)]);
    const next = reducer(state, { type: 'SORT_HAND', mode: 'color' });
    const colors = next.playerHand.map(c => c.color);
    expect(colors[0]).toBe('red');
    expect(colors[1]).toBe('blue');
    expect(colors[2]).toBe('yellow');
  });

  it('places tactic cards after troop cards regardless of sort mode', () => {
    const tacticCard = tactic('t5', 'Fog', 'fog');
    const state = stateWithHand([tacticCard, troop('green', 3), troop('red', 7)]);
    const next = reducer(state, { type: 'SORT_HAND', mode: 'value' });
    expect(next.playerHand[next.playerHand.length - 1].type).toBe('tactic');
  });
});

// ─── REORDER_HAND ─────────────────────────────────────────────────────────────

describe('REORDER_HAND', () => {
  it('swaps two cards by id', () => {
    const a = troop('red', 1);
    const b = troop('blue', 2);
    const c = troop('green', 3);
    const state = makeState({ playerHand: [a, b, c] });
    const next = reducer(state, { type: 'REORDER_HAND', fromId: a.id, toId: c.id });
    expect(next.playerHand[0].id).toBe(c.id);
    expect(next.playerHand[2].id).toBe(a.id);
    expect(next.playerHand[1].id).toBe(b.id);
  });
});

// ─── RESET_GAME ───────────────────────────────────────────────────────────────

describe('RESET_GAME', () => {
  it('returns a fresh initial state', () => {
    // Start with a heavily-modified state
    const state = createInitialState();
    state.gameStatus = 'playerWon';
    state.playerHand = [];
    state.flags[0].winner = 'player';
    const next = reducer(state, { type: 'RESET_GAME' });
    expect(next.gameStatus).toBe('playing');
    expect(next.playerHand.length).toBeGreaterThan(0);
    expect(next.flags[0].winner).toBeNull();
  });

  it('produces a full 46-card troop deck and 7-card player hand', () => {
    const state = reducer(createInitialState(), { type: 'RESET_GAME' });
    expect(state.deck).toHaveLength(46); // 60 - 7 (player) - 7 (opponent)
    expect(state.playerHand).toHaveLength(7);
    expect(state.opponentHand).toHaveLength(7);
  });
});

// ─── DESERTER_DISCARD ─────────────────────────────────────────────────────────

describe('DESERTER_DISCARD', () => {
  it('removes the card from the opponent formation and clears deserterActive', () => {
    const flags = createFlags();
    const opponentCard = troop('red', 5);
    flags[0].formation.opponent.cards = [opponentCard, troop('blue', 3)];
    const state = makeState({ flags, deserterActive: true });
    const next = reducer(state, { type: 'DESERTER_DISCARD', card: opponentCard, flagIndex: 0 });
    expect(next.flags[0].formation.opponent.cards.map(c => c.id)).not.toContain(opponentCard.id);
    expect(next.deserterActive).toBe(false);
    expect(next.pendingTactics).toBeNull();
  });
});

// ─── TRAITOR flow ─────────────────────────────────────────────────────────────

describe('TRAITOR flow', () => {
  it('TRAITOR_CAPTURE stores the card as pendingTraitor', () => {
    const flags = createFlags();
    const opponentCard = troop('red', 7);
    flags[0].formation.opponent.cards = [opponentCard];
    const state = makeState({ flags, traitorActive: true });
    const next = reducer(state, { type: 'TRAITOR_CAPTURE', card: opponentCard, flagIndex: 0 });
    expect(next.pendingTraitor).toEqual({ card: opponentCard, fromFlag: 0 });
    expect(next.traitorActive).toBe(false);
  });

  it('TRAITOR_PLACE moves the card to player side and clears pendingTraitor', () => {
    const flags = createFlags();
    const stolenCard = troop('red', 7);
    flags[0].formation.opponent.cards = [stolenCard];
    const state = makeState({
      flags,
      pendingTraitor: { card: stolenCard, fromFlag: 0 },
    });
    const next = reducer(state, { type: 'TRAITOR_PLACE', toFlagIndex: 2 });
    expect(next.flags[0].formation.opponent.cards.map(c => c.id)).not.toContain(stolenCard.id);
    expect(next.flags[2].formation.player.cards.map(c => c.id)).toContain(stolenCard.id);
    expect(next.pendingTraitor).toBeNull();
  });
});

// ─── REPLACE_STATE ────────────────────────────────────────────────────────────

describe('REPLACE_STATE', () => {
  it('replaces the entire state with the given state', () => {
    const original = createInitialState();
    const replacement = makeState({ playerHand: [troop('red', 9)], gameStatus: 'playing' });
    const next = reducer(original, { type: 'REPLACE_STATE', state: replacement });
    expect(next.playerHand).toHaveLength(1);
    expect(next.playerHand[0].id).toBe('red-9');
  });

  it('returns an independent copy (structuredClone) — mutating result does not affect payload', () => {
    const replacement = makeState({ playerHand: [troop('blue', 4)] });
    const next = reducer(makeState(), { type: 'REPLACE_STATE', state: replacement });
    // Mutate the result
    next.playerHand.push(troop('green', 5));
    // Original replacement payload is unchanged
    expect(replacement.playerHand).toHaveLength(1);
  });

  it('does not mutate the previous state', () => {
    const original = makeState({ playerHand: [troop('red', 1), troop('red', 2)] });
    const replacement = makeState({ playerHand: [] });
    reducer(original, { type: 'REPLACE_STATE', state: replacement });
    expect(original.playerHand).toHaveLength(2);
  });
});
