import { createContext, useContext } from 'react';
import type { Dispatch } from 'react';
import type { Card as CardType, GameState, TurnPhase } from '../types/game';
import type { GameAction } from '../engine/gameEngine';
import type { MultiplayerConfig, PeerStatus } from '../types/multiplayer';
import type { RematchPending } from '../components/VictoryModal';

interface GameContextValue {
  // Core state & dispatch
  gameState: GameState;
  dispatch: Dispatch<GameAction>;

  // Turn info
  currentTurn: TurnPhase;
  turnMessage: string;
  toastMessage: string | null;

  // Player interactions
  handleCardClick: (card: CardType) => void;
  handleFlagClick: (flagIndex: number) => void;
  handleDeckDraw: (deckType: 'troop' | 'tactic') => void;
  handleNewGame: () => void;
  handleOpponentCardClick: (card: CardType, flagIndex: number) => void;
  handleRedeployConfirm: (sourceFlagIndex: number, cardIndex: number, destinationFlagIndex: number | null) => void;
  handleScoutDraw: (deckType: 'troop' | 'tactic') => void;
  handleScoutSkipDraws: () => void;
  handleScoutDiscard: (cards: [CardType, CardType]) => void;
  handleTacticsConfigConfirm: (color: string, value: number) => void;
  handleTacticsCancel: () => void;
  handleTraitorPlace: (toFlagIndex: number) => void;
  handleCardDrop: (card: CardType, flagIndex: number) => void;
  handleSwapCards: (fromId: string, toId: string) => void;
  handleSortHand: (mode: 'value' | 'color') => void;
  handleSave: () => void;
  handleConcede: () => void;
  rematchPending: RematchPending;
  handleProposeRematch: () => void;
  handleAcceptRematch: () => void;

  // Animation state (read by GameBoard to render CardFly)
  flyingCard: CardType | null;
  flyFrom: { x: number; y: number };
  flyTo: { x: number; y: number };
  animatingAction: 'PLAY_CARD' | 'DRAW_CARD' | null;
  onFlyComplete: () => void;

  // Navigation
  onExit: () => void;

  // Multiplayer (undefined = singleplayer vs CPU)
  multiplayerConfig?: MultiplayerConfig;
  peerStatus: PeerStatus;
  /** True once the host has received at least one guest connection. */
  hadGuest: boolean;
  peerRetryCount: number;
  peerLastError: string | null;
  advanceToPlayerTurn: () => void;

  // UI-only modal visibility
  showRules: boolean;
  showGuide: boolean;
  showStats: boolean;
  rulesTab: 'rules' | 'tactics';
  setRulesTab: (tab: 'rules' | 'tactics') => void;
  guideTab: 'formations' | 'tactics';
  setGuideTab: (tab: 'formations' | 'tactics') => void;
  openRules: () => void;
  openGuide: () => void;
  openStats: () => void;
  closeRules: () => void;
  closeGuide: () => void;
  closeStats: () => void;
}

export const GameContext = createContext<GameContextValue | null>(null);

export function useGameContext(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGameContext must be used within a GameContext.Provider');
  return ctx;
}
