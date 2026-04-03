import { describe, it, expect, beforeEach } from 'vitest';
import { encodeGameToUrl, decodeGameFromUrl, clearGameParam } from '../utils/urlGameState';
import { createFlags } from '../utils/gameLogic';
import { troop, tactic, makeState } from './helpers';
import type { MultiplayerConfig, LocalPlayer } from '../types/multiplayer';

// ── Helpers ──────────────────────────────────────────────────────────────────

const HOST: LocalPlayer  = { id: 'h-id', username: 'Alice' };
const GUEST: LocalPlayer = { id: 'g-id', username: 'Bob' };

function hostConfig(currentTurnName = HOST.username): MultiplayerConfig {
  return {
    localPlayer: HOST,
    opponentName: GUEST.username,
    isHost: true,
    transport: 'url-async',
    hostName: HOST.username,
    guestName: GUEST.username,
    currentTurnName,
  };
}

function guestConfig(currentTurnName = GUEST.username): MultiplayerConfig {
  return {
    localPlayer: GUEST,
    opponentName: HOST.username,
    isHost: false,
    transport: 'url-async',
    hostName: HOST.username,
    guestName: GUEST.username,
    currentTurnName,
  };
}

/** Decode URL-safe base64 to a parsed object (test helper only). */
function decodePayload(url: string): Record<string, unknown> {
  const raw = new URL(url).searchParams.get('game')!;
  const padded = raw.replace(/-/g, '+').replace(/_/g, '/');
  const pad = (4 - (padded.length % 4)) % 4;
  const json = atob(padded + '='.repeat(pad));
  return JSON.parse(json);
}

/** Point window.location at a fake URL for a test. */
function setFakeUrl(search = '') {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: {
      origin: 'http://localhost',
      pathname: '/',
      search,
      href: `http://localhost/${search}`,
    },
  });
  Object.defineProperty(window, 'history', {
    configurable: true,
    writable: true,
    value: { replaceState: () => {} },
  });
}

beforeEach(() => setFakeUrl());

// ── encodeGameToUrl ───────────────────────────────────────────────────────────

describe('encodeGameToUrl', () => {
  it('returns a URL with a ?game= param', () => {
    const url = encodeGameToUrl(makeState(), hostConfig());
    expect(url).toMatch(/^http:\/\/localhost\/\?game=/);
  });

  it('stores hostName and guestName in the payload', () => {
    const payload = decodePayload(encodeGameToUrl(makeState(), hostConfig()));
    expect(payload.hostName).toBe('Alice');
    expect(payload.guestName).toBe('Bob');
  });

  it('puts host playerHand into hostHand, opponentHand into guestHand', () => {
    const state = makeState({
      playerHand: [troop('red', 5), troop('red', 6)],
      opponentHand: [troop('blue', 3)],
    });
    const payload = decodePayload(encodeGameToUrl(state, hostConfig()));
    expect((payload.hostHand as unknown[]).length).toBe(2);
    expect((payload.guestHand as unknown[]).length).toBe(1);
  });

  it('flips hands when encoding from the guest perspective', () => {
    const state = makeState({
      // Bob (guest) has 1 card; Alice (host) has 2
      playerHand: [troop('green', 7)],
      opponentHand: [troop('purple', 2), troop('orange', 4)],
    });
    const payload = decodePayload(encodeGameToUrl(state, guestConfig()));
    // guestHand = Bob's hand (playerHand from Bob's view)
    expect((payload.guestHand as unknown[]).length).toBe(1);
    // hostHand = Alice's hand (opponentHand from Bob's view)
    expect((payload.hostHand as unknown[]).length).toBe(2);
  });

  it('stores currentTurnName verbatim', () => {
    const payload = decodePayload(encodeGameToUrl(makeState(), hostConfig(GUEST.username)));
    expect(payload.currentTurnName).toBe('Bob');
  });

  it('encodes flags as host-centric', () => {
    const flags = createFlags();
    flags[0].formation.player.cards   = [troop('red', 5)];
    flags[0].formation.opponent.cards = [troop('blue', 3)];
    const state = makeState({ flags });
    const payload = decodePayload(encodeGameToUrl(state, hostConfig()));
    const f0 = (payload.flags as { hostCards: unknown[]; guestCards: unknown[] }[])[0];
    expect(f0.hostCards.length).toBe(1);
    expect(f0.guestCards.length).toBe(1);
  });

  it('maps player winner to "host" when encoding as host', () => {
    const flags = createFlags();
    flags[0].winner = 'player';
    const state = makeState({ flags });
    const payload = decodePayload(encodeGameToUrl(state, hostConfig()));
    expect((payload.flags as { winner: string }[])[0].winner).toBe('host');
  });

  it('maps opponent winner to "guest" when encoding as host', () => {
    const flags = createFlags();
    flags[0].winner = 'opponent';
    const state = makeState({ flags });
    const payload = decodePayload(encodeGameToUrl(state, hostConfig()));
    expect((payload.flags as { winner: string }[])[0].winner).toBe('guest');
  });
});

// ── decodeGameFromUrl ─────────────────────────────────────────────────────────

describe('decodeGameFromUrl', () => {
  it('returns null when no ?game= param is present', () => {
    setFakeUrl('');
    expect(decodeGameFromUrl(HOST)).toBeNull();
  });

  it('returns null for a malformed ?game= param', () => {
    setFakeUrl('?game=!!!notbase64!!!');
    expect(decodeGameFromUrl(HOST)).toBeNull();
  });

  it('round-trips a state from the host perspective', () => {
    const original = makeState({
      playerHand: [troop('red', 5), troop('blue', 9)],
      opponentHand: [troop('green', 4)],
      deck: [troop('orange', 1)],
    });
    const url = encodeGameToUrl(original, hostConfig());
    setFakeUrl(`?game=${new URL(url).searchParams.get('game')}`);

    const decoded = decodeGameFromUrl(HOST)!;
    expect(decoded).not.toBeNull();
    expect(decoded.gameState.playerHand).toHaveLength(2);
    expect(decoded.gameState.opponentHand).toHaveLength(1);
    expect(decoded.gameState.deck).toHaveLength(1);
  });

  it('round-trips a state from the guest perspective', () => {
    // Encode as guest (Bob's POV: playerHand=Bob, opponentHand=Alice)
    const original = makeState({
      playerHand: [troop('red', 5), troop('blue', 9), troop('green', 3)],
      opponentHand: [troop('orange', 4), troop('purple', 7)],
    });
    const url = encodeGameToUrl(original, guestConfig());
    setFakeUrl(`?game=${new URL(url).searchParams.get('game')}`);

    const decoded = decodeGameFromUrl(GUEST)!;
    expect(decoded.gameState.playerHand).toHaveLength(3);
    expect(decoded.gameState.opponentHand).toHaveLength(2);
  });

  it("sets turnPhase to 'player' when it is the local player's turn", () => {
    const url = encodeGameToUrl(makeState(), hostConfig(HOST.username));
    setFakeUrl(`?game=${new URL(url).searchParams.get('game')}`);
    expect(decodeGameFromUrl(HOST)!.turnPhase).toBe('player');
  });

  it("sets turnPhase to 'opponent' when it is the opponent's turn", () => {
    const url = encodeGameToUrl(makeState(), hostConfig(GUEST.username));
    setFakeUrl(`?game=${new URL(url).searchParams.get('game')}`);
    expect(decodeGameFromUrl(HOST)!.turnPhase).toBe('opponent');
  });

  it("sets turnPhase to 'player' for the guest when it is the guest's turn", () => {
    const url = encodeGameToUrl(makeState(), hostConfig(GUEST.username));
    setFakeUrl(`?game=${new URL(url).searchParams.get('game')}`);
    expect(decodeGameFromUrl(GUEST)!.turnPhase).toBe('player');
  });

  it('reconstructs multiplayerConfig correctly for the host', () => {
    const url = encodeGameToUrl(makeState(), hostConfig());
    setFakeUrl(`?game=${new URL(url).searchParams.get('game')}`);

    const cfg = decodeGameFromUrl(HOST)!.multiplayerConfig;
    expect(cfg.isHost).toBe(true);
    expect(cfg.hostName).toBe('Alice');
    expect(cfg.guestName).toBe('Bob');
    expect(cfg.opponentName).toBe('Bob');
    expect(cfg.transport).toBe('url-async');
  });

  it('reconstructs multiplayerConfig correctly for the guest', () => {
    const url = encodeGameToUrl(makeState(), hostConfig(GUEST.username));
    setFakeUrl(`?game=${new URL(url).searchParams.get('game')}`);

    const cfg = decodeGameFromUrl(GUEST)!.multiplayerConfig;
    expect(cfg.isHost).toBe(false);
    expect(cfg.opponentName).toBe('Alice');
  });

  it('preserves flag modifiers across the round-trip', () => {
    const flags = createFlags();
    flags[0].modifiers = ['fog', 'mud'];
    const url = encodeGameToUrl(makeState({ flags }), hostConfig());
    setFakeUrl(`?game=${new URL(url).searchParams.get('game')}`);

    const decoded = decodeGameFromUrl(HOST)!;
    expect(decoded.gameState.flags[0].modifiers).toEqual(['fog', 'mud']);
  });

  it("maps 'host' winner to 'player' for the host decoder", () => {
    const flags = createFlags();
    flags[2].winner = 'player'; // host's player won it
    const url = encodeGameToUrl(makeState({ flags }), hostConfig());
    setFakeUrl(`?game=${new URL(url).searchParams.get('game')}`);

    expect(decodeGameFromUrl(HOST)!.gameState.flags[2].winner).toBe('player');
  });

  it("maps 'host' winner to 'opponent' for the guest decoder", () => {
    const flags = createFlags();
    flags[2].winner = 'player'; // Alice (host) won it
    const url = encodeGameToUrl(makeState({ flags }), hostConfig());
    setFakeUrl(`?game=${new URL(url).searchParams.get('game')}`);

    // Bob (guest) should see Alice's win as 'opponent'
    expect(decodeGameFromUrl(GUEST)!.gameState.flags[2].winner).toBe('opponent');
  });

  it('preserves tactic cards in the hand', () => {
    const scoutCard = tactic('t7', 'Scout', 'scout');
    const state = makeState({ playerHand: [scoutCard, troop('red', 5)] });
    const url = encodeGameToUrl(state, hostConfig());
    setFakeUrl(`?game=${new URL(url).searchParams.get('game')}`);

    const hand = decodeGameFromUrl(HOST)!.gameState.playerHand;
    expect(hand).toHaveLength(2);
    const scout = hand.find(c => c.id === 't7');
    expect(scout?.type).toBe('tactic');
  });

  it('preserves tacticsDeck and playerTacticsPlayed counter', () => {
    const state = makeState({
      tacticsDeck: [tactic('t1', 'Leader', 'wild')],
      playerTacticsPlayed: 2,
    });
    const url = encodeGameToUrl(state, hostConfig());
    setFakeUrl(`?game=${new URL(url).searchParams.get('game')}`);

    const decoded = decodeGameFromUrl(HOST)!.gameState;
    expect(decoded.tacticsDeck).toHaveLength(1);
    expect(decoded.playerTacticsPlayed).toBe(2);
  });

  it('preserves gameStatus', () => {
    const state = makeState({ gameStatus: 'playerWon' });
    const url = encodeGameToUrl(state, hostConfig());
    setFakeUrl(`?game=${new URL(url).searchParams.get('game')}`);

    expect(decodeGameFromUrl(HOST)!.gameState.gameStatus).toBe('playerWon');
  });
});

// ── clearGameParam ────────────────────────────────────────────────────────────

describe('clearGameParam', () => {
  it('calls history.replaceState to strip the ?game= param', () => {
    let replacedWith = '';
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: {
        origin: 'http://localhost',
        pathname: '/',
        search: '?game=abc123',
        href: 'http://localhost/?game=abc123',
      },
    });
    Object.defineProperty(window, 'history', {
      configurable: true,
      writable: true,
      value: {
        replaceState: (_s: unknown, _t: unknown, url: string) => { replacedWith = url; },
      },
    });

    clearGameParam();
    expect(replacedWith).not.toContain('game=');
    expect(replacedWith).toBe('/');
  });
});
