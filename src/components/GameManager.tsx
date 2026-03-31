import { useReducer } from 'react';
import { reducer } from '../engine/gameEngine';
import { createInitialState } from '../engine/initialState';
import { GameContext } from '../context/GameContext';
import { useAnimations } from '../hooks/useAnimateAction';
import { useModalManager } from '../hooks/useModalManager';
import { useTurnManager } from '../hooks/useTurnManager';
import { GameBoard } from './GameBoard';

export function GameManager({ onExit }: { onExit: () => void }) {
  const [gameState, dispatch] = useReducer(reducer, createInitialState());

  const animations = useAnimations();
  const modals = useModalManager();
  const turn = useTurnManager({
    gameState,
    dispatch,
    animate: animations.animate,
    setAnimatingAction: animations.setAnimatingAction,
    resetAnimations: animations.resetAnimations,
  });

  return (
    <GameContext.Provider value={{
      gameState,
      dispatch,
      onExit,
      currentTurn: turn.currentTurn,
      turnMessage: turn.turnMessage,
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
      flyingCard: animations.flyingCard,
      flyFrom: animations.flyFrom,
      flyTo: animations.flyTo,
      animatingAction: animations.animatingAction,
      onFlyComplete: animations.handleFlyComplete,
      showRules: modals.showRules,
      showGuide: modals.showGuide,
      showStats: modals.showStats,
      openRules: modals.openRules,
      openGuide: modals.openGuide,
      openStats: modals.openStats,
      closeRules: modals.closeRules,
      closeGuide: modals.closeGuide,
      closeStats: modals.closeStats,
    }}>
      <GameBoard />
    </GameContext.Provider>
  );
}
