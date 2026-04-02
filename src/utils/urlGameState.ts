/**
 * URL-encoded async multiplayer state.
 *
 * Game state is stored in HOST-CENTRIC form — flags and hands always use
 * "host" / "guest" keys regardless of who is viewing. This means both players
 * can open the same URL and each sees the correct board from their perspective.
 *
 * The URL param is: ?game=<base64url>
 */

import type { GameState } from '../types/game';
import type { TurnPhase } from '../types/game';
import type { LocalPlayer, MultiplayerConfig } from '../types/multiplayer';
import { encodeCard, decodeCard } from './saveGame';

const PARAM = 'game';

// ── Slot schema ────────────────────────────────────────────────────────────

interface UrlSlot {
  v: 1;
  // Who is who
  hostName: string;
  guestName: string;
  currentTurnName: string; // value is either hostName or guestName
  // Decks (shared; order matters)
  deck: string[];
  tacticsDeck: string[];
  // Hands — always in host/guest terms, never player/opponent
  hostHand: string[];
  guestHand: string[];
  // Flags — ditto
  flags: {
    hostCards: string[];
    guestCards: string[];
    modifiers: string[];
    winner: 'host' | 'guest' | null;
  }[];
  hostTacticsPlayed: number;
  guestTacticsPlayed: number;
  gameStatus: string;
  // Pending tactic states (these belong to the current active player)
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

// ── Base64 helpers (UTF-8 safe) ────────────────────────────────────────────

function toB64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach(b => (bin += String.fromCharCode(b)));
  // Replace + / = so the value is URL-safe without needing encodeURIComponent
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromB64(b64: string): string {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
  const pad = (4 - (padded.length % 4)) % 4;
  const bin = atob(padded + '='.repeat(pad));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

// ── Encode ─────────────────────────────────────────────────────────────────

export function encodeGameToUrl(
  gameState: GameState,
  config: MultiplayerConfig,
): string {
  const enc = encodeCard;
  const isHost = config.isHost;

  // Normalise to host-centric perspective.
  const hostHand    = isHost ? gameState.playerHand   : gameState.opponentHand;
  const guestHand   = isHost ? gameState.opponentHand : gameState.playerHand;
  const hostTactics = isHost ? gameState.playerTacticsPlayed   : gameState.opponentTacticsPlayed;
  const guestTactics = isHost ? gameState.opponentTacticsPlayed : gameState.playerTacticsPlayed;

  const slot: UrlSlot = {
    v: 1,
    hostName: config.hostName,
    guestName: config.guestName,
    currentTurnName: config.currentTurnName,
    deck: gameState.deck.map(enc),
    tacticsDeck: gameState.tacticsDeck.map(enc),
    hostHand: hostHand.map(enc),
    guestHand: guestHand.map(enc),
    flags: gameState.flags.map(f => {
      const hostCards  = isHost ? f.formation.player.cards   : f.formation.opponent.cards;
      const guestCards = isHost ? f.formation.opponent.cards : f.formation.player.cards;
      let winner: 'host' | 'guest' | null = null;
      if (f.winner === 'player')   winner = isHost ? 'host' : 'guest';
      if (f.winner === 'opponent') winner = isHost ? 'guest' : 'host';
      return {
        hostCards:  hostCards.map(enc),
        guestCards: guestCards.map(enc),
        modifiers: [...f.modifiers],
        winner,
      };
    }),
    hostTacticsPlayed:  hostTactics,
    guestTacticsPlayed: guestTactics,
    gameStatus: gameState.gameStatus,
    deserterActive: gameState.deserterActive,
    traitorActive:  gameState.traitorActive,
    redeployState:  gameState.redeployState,
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

  const encoded = toB64(JSON.stringify(slot));
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?${PARAM}=${encoded}`;
}

// ── Decode ─────────────────────────────────────────────────────────────────

export interface DecodedUrlGame {
  gameState: GameState;
  turnPhase: TurnPhase;
  multiplayerConfig: MultiplayerConfig;
}

/**
 * Attempts to decode a ?game= URL param into a full game + multiplayer config.
 * Returns null if the param is absent or malformed.
 * @param localPlayer The player loading the page (from localStorage profile).
 */
export function decodeGameFromUrl(localPlayer: LocalPlayer): DecodedUrlGame | null {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get(PARAM);
  if (!raw) return null;

  try {
    const slot: UrlSlot = JSON.parse(fromB64(raw));
    if (slot.v !== 1) return null;

    const dec = decodeCard;
    const isHost = localPlayer.username === slot.hostName;
    // Guest is whoever isn't the host — match by name, fall back to guest
    const isGuest = localPlayer.username === slot.guestName;
    // Whoever opens the link is treated as the "local player"; default to guest
    // perspective if no name match (view-only observer edge case).
    const localIsHost = isHost && !isGuest;

    // Re-map host/guest hands to player/opponent from local perspective.
    const playerHand   = localIsHost ? slot.hostHand.map(dec)  : slot.guestHand.map(dec);
    const opponentHand = localIsHost ? slot.guestHand.map(dec) : slot.hostHand.map(dec);
    const playerTactics   = localIsHost ? slot.hostTacticsPlayed  : slot.guestTacticsPlayed;
    const opponentTactics = localIsHost ? slot.guestTacticsPlayed : slot.hostTacticsPlayed;

    const flags = slot.flags.map((f, i) => {
      const playerCards   = (localIsHost ? f.hostCards  : f.guestCards).map(dec);
      const opponentCards = (localIsHost ? f.guestCards : f.hostCards).map(dec);
      let winner: 'player' | 'opponent' | null = null;
      if (f.winner === 'host')  winner = localIsHost ? 'player' : 'opponent';
      if (f.winner === 'guest') winner = localIsHost ? 'opponent' : 'player';
      return {
        id: i + 1,
        formation: {
          player:   { cards: playerCards,   owner: null as null },
          opponent: { cards: opponentCards, owner: null as null },
        },
        modifiers: f.modifiers,
        winner,
      };
    });

    const gameState: GameState = {
      deck: slot.deck.map(dec),
      tacticsDeck: slot.tacticsDeck.map(dec),
      playerHand,
      opponentHand,
      flags,
      playerTacticsPlayed:  playerTactics,
      opponentTacticsPlayed: opponentTactics,
      gameStatus: slot.gameStatus as GameState['gameStatus'],
      selectedCard: null,
      selectedFlag: null,
      deserterActive: slot.deserterActive,
      traitorActive:  slot.traitorActive,
      redeployState:  slot.redeployState,
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

    const isLocalPlayerTurn = localPlayer.username === slot.currentTurnName;
    const turnPhase: TurnPhase = isLocalPlayerTurn ? 'player' : 'opponent';

    const multiplayerConfig: MultiplayerConfig = {
      localPlayer,
      opponentName: localIsHost ? slot.guestName : slot.hostName,
      isHost: localIsHost,
      transport: 'url-async',
      hostName: slot.hostName,
      guestName: slot.guestName,
      currentTurnName: slot.currentTurnName,
    };

    return { gameState, turnPhase, multiplayerConfig };
  } catch {
    return null;
  }
}

/** Removes ?game= from the browser URL without triggering a reload. */
export function clearGameParam(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(PARAM);
  window.history.replaceState({}, '', url.pathname + (url.search || ''));
}
