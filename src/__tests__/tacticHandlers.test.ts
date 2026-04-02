import { describe, it, expect } from 'vitest';
import {
  applyFlagWinnerCheck,
  handleApplyTactic,
  handleSetWildCard,
} from '../engine/tacticHandlers';
import { troop, tactic, makeFlag, makeState } from './helpers';
import { createFlags } from '../utils/gameLogic';

// ─── applyFlagWinnerCheck ─────────────────────────────────────────────────────

describe('applyFlagWinnerCheck', () => {
  it('sets flag.winner when a winner is determined', () => {
    // Player: wedge [red-8, red-9, red-10] = 27×10000 = 270000
    // Opponent: host [blue-1, green-5, orange-9] = 15
    const state = makeState();
    state.flags[0].formation.player.cards = [
      troop('red', 8), troop('red', 9), troop('red', 10),
    ];
    state.flags[0].formation.opponent.cards = [
      troop('blue', 1), troop('green', 5), troop('orange', 9),
    ];
    applyFlagWinnerCheck(state, 0);
    expect(state.flags[0].winner).toBe('player');
  });

  it('sets gameStatus to playerWon when player captures 5 flags', () => {
    const state = makeState();
    // Pre-win: player already has 4 flags won
    [1, 2, 3, 4].forEach(i => { state.flags[i].winner = 'player'; });
    // Flag 0: give player a winning formation
    state.flags[0].formation.player.cards = [
      troop('red', 8), troop('red', 9), troop('red', 10),
    ];
    state.flags[0].formation.opponent.cards = [
      troop('blue', 1), troop('green', 2), troop('orange', 3),
    ];
    applyFlagWinnerCheck(state, 0);
    expect(state.flags[0].winner).toBe('player');
    expect(state.gameStatus).toBe('playerWon');
  });

  it('does nothing when neither side has a complete formation', () => {
    const state = makeState();
    state.flags[0].formation.player.cards = [troop('red', 5)];
    applyFlagWinnerCheck(state, 0);
    expect(state.flags[0].winner).toBeNull();
    expect(state.gameStatus).toBe('playing');
  });
});

// ─── handleApplyTactic ────────────────────────────────────────────────────────

describe('handleApplyTactic', () => {
  it('removes the card from the player hand and increments tactics counter', () => {
    const fogCard = tactic('t5', 'Fog', 'fog');
    const state = makeState({ playerHand: [fogCard, troop('red', 5)] });
    handleApplyTactic(state, fogCard, 0);
    expect(state.playerHand.map(c => c.id)).not.toContain('t5');
    expect(state.playerTacticsPlayed).toBe(1);
  });

  it('Fog: adds fog modifier to the flag', () => {
    const fogCard = tactic('t5', 'Fog', 'fog');
    const state = makeState({ playerHand: [fogCard] });
    handleApplyTactic(state, fogCard, 2);
    expect(state.flags[2].modifiers).toContain('fog');
  });

  it('Fog: does not apply to an already-won flag', () => {
    const fogCard = tactic('t5', 'Fog', 'fog');
    const state = makeState({ playerHand: [fogCard] });
    state.flags[2].winner = 'opponent';
    handleApplyTactic(state, fogCard, 2);
    // Card should NOT be removed (action was rejected early)
    expect(state.playerHand.map(c => c.id)).toContain('t5');
    expect(state.flags[2].modifiers).not.toContain('fog');
  });

  it('Fog: does not add duplicate modifier if already present', () => {
    const fogCard = tactic('t5', 'Fog', 'fog');
    const state = makeState({ playerHand: [fogCard] });
    state.flags[0].modifiers = ['fog'];
    handleApplyTactic(state, fogCard, 0);
    expect(state.flags[0].modifiers.filter(m => m === 'fog')).toHaveLength(1);
  });

  it('Mud: adds mud modifier to the flag', () => {
    const mudCard = tactic('t6', 'Mud', 'mud');
    const state = makeState({ playerHand: [mudCard] });
    handleApplyTactic(state, mudCard, 1);
    expect(state.flags[1].modifiers).toContain('mud');
  });

  it('Mud: blocked on a won flag (same as Fog)', () => {
    const mudCard = tactic('t6', 'Mud', 'mud');
    const state = makeState({ playerHand: [mudCard] });
    state.flags[0].winner = 'player';
    handleApplyTactic(state, mudCard, 0);
    expect(state.playerHand.map(c => c.id)).toContain('t6');
  });

  it('Scout: initializes scoutDrawStep', () => {
    const scoutCard = tactic('t7', 'Scout', 'scout');
    const state = makeState({ playerHand: [scoutCard] });
    handleApplyTactic(state, scoutCard, 0);
    expect(state.scoutDrawStep).toEqual({ drawn: [], remaining: 3 });
  });

  it('Deserter: sets deserterActive and pendingTactics', () => {
    const deserterCard = tactic('t9', 'Deserter', 'deserter');
    const state = makeState({ playerHand: [deserterCard] });
    handleApplyTactic(state, deserterCard, 3);
    expect(state.deserterActive).toBe(true);
    expect(state.pendingTactics).toEqual({ card: deserterCard, flagIndex: 3 });
  });

  it('Traitor: sets traitorActive and pendingTactics', () => {
    const traitorCard = tactic('t10', 'Traitor', 'traitor');
    const state = makeState({ playerHand: [traitorCard] });
    handleApplyTactic(state, traitorCard, 4);
    expect(state.traitorActive).toBe(true);
    expect(state.pendingTactics?.card.id).toBe('t10');
  });

  it('Redeploy: sets redeployState and pendingTactics', () => {
    const redeployCard = tactic('t8', 'Redeploy', 'redeploy');
    const state = makeState({ playerHand: [redeployCard] });
    handleApplyTactic(state, redeployCard, 5);
    expect(state.redeployState).toBe(true);
    expect(state.pendingTactics?.flagIndex).toBe(5);
  });

  it('Leader: sets leaderPending and returns without drawing flag', () => {
    const leaderCard = tactic('t1', 'Leader', 'wild');
    const state = makeState({ playerHand: [leaderCard] });
    handleApplyTactic(state, leaderCard, 0);
    expect(state.leaderPending).toEqual({ card: leaderCard, flagIndex: 0 });
    // Should NOT add fog/mud/scout/etc
    expect(state.scoutDrawStep).toBeNull();
  });

  it('Companion Cavalry: sets companionPending', () => {
    const companionCard = tactic('t3', 'Companion Cavalry', 'value8', 8);
    const state = makeState({ playerHand: [companionCard] });
    handleApplyTactic(state, companionCard, 2);
    expect(state.companionPending).toEqual({ card: companionCard, flagIndex: 2 });
  });

  it('Shield Bearers: sets shieldPending', () => {
    const shieldCard = tactic('t4', 'Shield Bearers', 'value≤3', 3);
    const state = makeState({ playerHand: [shieldCard] });
    handleApplyTactic(state, shieldCard, 7);
    expect(state.shieldPending).toEqual({ card: shieldCard, flagIndex: 7 });
  });
});

// ─── handleSetWildCard ────────────────────────────────────────────────────────

describe('handleSetWildCard', () => {
  it('returns unchanged state if pending is undefined', () => {
    const state = makeState();
    const before = structuredClone(state);
    handleSetWildCard(state, undefined, s => { s.leaderPending = undefined; }, 'red', 7);
    expect(state.flags).toEqual(before.flags);
    expect(state.gameStatus).toBe('playing');
  });

  it('places the configured card on the correct flag', () => {
    const leaderCard = tactic('t1', 'Leader', 'wild');
    const state = makeState({ leaderPending: { card: leaderCard, flagIndex: 0 } });
    handleSetWildCard(
      state,
      state.leaderPending,
      s => { s.leaderPending = undefined; },
      'red',
      7,
    );
    const placedCard = state.flags[0].formation.player.cards[0];
    expect(placedCard).toBeDefined();
    expect(placedCard.color).toBe('red');
    expect(placedCard.value).toBe(7);
  });

  it('clears leaderPending and pendingTactics after placement', () => {
    const leaderCard = tactic('t1', 'Leader', 'wild');
    const state = makeState({ leaderPending: { card: leaderCard, flagIndex: 0 } });
    handleSetWildCard(
      state,
      state.leaderPending,
      s => { s.leaderPending = undefined; },
      'blue',
      9,
    );
    expect(state.leaderPending).toBeUndefined();
    expect(state.pendingTactics).toBeNull();
  });

  it('runs winner check after placement', () => {
    // Fill a flag with 2 player cards. Wild card completes a strong formation.
    // Give opponent a weaker complete formation so player wins.
    const leaderCard = tactic('t1', 'Leader', 'wild');
    const flags = createFlags();
    flags[0].formation.player.cards = [troop('red', 9), troop('red', 10)];
    flags[0].formation.opponent.cards = [troop('blue', 1), troop('green', 2), troop('orange', 3)];
    const state = makeState({
      flags,
      leaderPending: { card: leaderCard, flagIndex: 0 },
    });
    // Adding red-8 gives player [red-8, red-9, red-10] → wedge
    handleSetWildCard(
      state,
      state.leaderPending,
      s => { s.leaderPending = undefined; },
      'red',
      8,
    );
    expect(state.flags[0].winner).toBe('player');
  });
});
