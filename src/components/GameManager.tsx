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

interface GameManagerProps {
  onExit: () => void;
  initialState?: LoadedSave;
  multiplayerConfig?: MultiplayerConfig;
}

export function GameManager({ onExit, initialState, multiplayerConfig }: GameManagerProps) {
  const [gameState, dispatch] = useReducer(
    reducer,
    undefined,
    () => initialState?.gameState ?? createInitialState(),
  );

  const animations = useAnimations();
  const modals = useModalManager();
  const turn = useTurnManager({
    gameState,
    dispatch,
    animate: animations.animate,
    setAnimatingAction: animations.setAnimatingAction,
    resetAnimations: animations.resetAnimations,
    initialTurnPhase: initialState?.turnPhase,
    onAsyncTurnEnd: isAsyncMultiplayer ? handleAsyncTurnEnd : undefined,
  });

  const handleSave = useCallback(() => {
    saveGame(gameState, turn.currentTurn);
  }, [gameState, turn.currentTurn]);

  // ── URL-async multiplayer ────────────────────────────────────────────────
  const isAsyncMultiplayer = multiplayerConfig?.transport === 'url-async';

  const [showShareModal, setShowShareModal] = useState(false);

  // Build the share URL: next player's name becomes currentTurnName.
  const shareUrl = useMemo(() => {
    if (!multiplayerConfig || !isAsyncMultiplayer) return '';
    const nextTurnName = multiplayerConfig.currentTurnName === multiplayerConfig.hostName
      ? multiplayerConfig.guestName
      : multiplayerConfig.hostName;
    return encodeGameToUrl(gameState, { ...multiplayerConfig, currentTurnName: nextTurnName });
  }, [gameState, multiplayerConfig, isAsyncMultiplayer]);

  const handleAsyncTurnEnd = useCallback(() => {
    setShowShareModal(true);
  }, []);

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
      shareUrl,
      onShareModalDone: handleShareModalDone,
    }}>
      <GameBoard />
    </GameContext.Provider>
  );
}
