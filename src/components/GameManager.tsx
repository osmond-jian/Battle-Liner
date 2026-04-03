import { useCallback, useMemo, useReducer, useState } from 'react';
import { reducer } from '../engine/gameEngine';
import { createInitialState } from '../engine/initialState';
import { GameContext } from '../context/GameContext';
import { useAnimations } from '../hooks/useAnimateAction';
import { useModalManager } from '../hooks/useModalManager';
import { useTurnManager } from '../hooks/useTurnManager';
import { GameBoard } from './GameBoard';
import { saveGame, type LoadedSave } from '../utils/saveGame';
import { encodeGameToUrl } from '../utils/urlGameState';
import type { MultiplayerConfig } from '../types/multiplayer';
import type { TurnPhase } from '../types/game';

interface GameManagerProps {
  onExit: () => void;
  initialState?: LoadedSave;
  multiplayerConfig?: MultiplayerConfig;
  /** Overrides initialState.turnPhase (used for solo random-first-player). */
  initialTurnPhase?: TurnPhase;
}

export function GameManager({ onExit, initialState, multiplayerConfig, initialTurnPhase }: GameManagerProps) {
  const [gameState, dispatch] = useReducer(
    reducer,
    undefined,
    () => initialState?.gameState ?? createInitialState(),
  );

  const animations = useAnimations();
  const modals = useModalManager();

  // ── URL-async multiplayer ────────────────────────────────────────────────
  // Declared before useTurnManager so they can be passed in without a TDZ error.
  const isAsyncMultiplayer = multiplayerConfig?.transport === 'url-async';

  // When the host creates a game where the guest goes first, we immediately show
  // the invite modal so the host can send the initial link before any moves are made.
  const initialPhase = initialTurnPhase ?? initialState?.turnPhase;
  const isInitialInvite = isAsyncMultiplayer && initialPhase === 'opponent';

  const [showShareModal, setShowShareModal] = useState(isInitialInvite);
  const [isInviteModal, setIsInviteModal] = useState(isInitialInvite);

  const handleAsyncTurnEnd = useCallback(() => {
    setIsInviteModal(false);
    setShowShareModal(true);
  }, []);

  const turn = useTurnManager({
    gameState,
    dispatch,
    animate: animations.animate,
    setAnimatingAction: animations.setAnimatingAction,
    resetAnimations: animations.resetAnimations,
    initialTurnPhase: initialTurnPhase ?? initialState?.turnPhase,
    onAsyncTurnEnd: isAsyncMultiplayer ? handleAsyncTurnEnd : undefined,
  });

  const handleSave = useCallback(() => {
    saveGame(gameState, turn.currentTurn);
  }, [gameState, turn.currentTurn]);

  // Build the share URL.
  // For invite modals (guest goes first, host hasn't played yet): the link should
  // tell the guest it's their turn — currentTurnName stays as-is (already the guest).
  // For post-turn modals: the link always hands off to the opponent.
  const shareUrl = useMemo(() => {
    if (!multiplayerConfig || !isAsyncMultiplayer) return '';
    const nextTurnName = isInviteModal
      ? multiplayerConfig.currentTurnName   // invite: encode "your turn" for the guest
      : multiplayerConfig.opponentName;     // post-turn: always the other person next
    return encodeGameToUrl(gameState, { ...multiplayerConfig, currentTurnName: nextTurnName });
  }, [gameState, multiplayerConfig, isAsyncMultiplayer, isInviteModal]);

  const handleShareModalDone = useCallback(() => {
    setShowShareModal(false);
  }, []);

  return (
    <GameContext.Provider value={{
      gameState,
      dispatch,
      onExit,
      currentTurn: turn.currentTurn,
      turnMessage: turn.turnMessage,
      toastMessage: turn.toastMessage,
      handleCardClick: turn.handleCardClick,
      handleFlagClick: turn.handleFlagClick,
      handleDeckDraw: turn.handleDeckDraw,
      handleNewGame: turn.handleNewGame,
      handleOpponentCardClick: turn.handleOpponentCardClick,
      handleRedeployConfirm: turn.handleRedeployConfirm,
      handleScoutDraw: turn.handleScoutDraw,
      handleScoutChoose: turn.handleScoutChoose,
      handleScoutDiscard: turn.handleScoutDiscard,
      handleTacticsConfigConfirm: turn.handleTacticsConfigConfirm,
      handleTacticsCancel: turn.handleTacticsCancel,
      handleTraitorPlace: turn.handleTraitorPlace,
      handleCardDrop: turn.handleCardDrop,
      handleSwapCards: turn.handleSwapCards,
      handleSortHand: turn.handleSortHand,
      handleSave,
      flyingCard: animations.flyingCard,
      flyFrom: animations.flyFrom,
      flyTo: animations.flyTo,
      animatingAction: animations.animatingAction,
      onFlyComplete: animations.handleFlyComplete,
      showRules: modals.showRules,
      showGuide: modals.showGuide,
      showStats: modals.showStats,
      rulesTab: modals.rulesTab,
      setRulesTab: modals.setRulesTab,
      openRules: modals.openRules,
      openGuide: modals.openGuide,
      openStats: modals.openStats,
      closeRules: modals.closeRules,
      closeGuide: modals.closeGuide,
      closeStats: modals.closeStats,
      multiplayerConfig,
      showShareModal,
      isInviteModal,
      shareUrl,
      onShareModalDone: handleShareModalDone,
    }}>
      <GameBoard />
    </GameContext.Provider>
  );
}
