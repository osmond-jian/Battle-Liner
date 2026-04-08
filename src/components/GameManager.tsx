import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { reducer } from '../engine/gameEngine';
import { createInitialState } from '../engine/initialState';
import { GameContext } from '../context/GameContext';
import { useAnimations } from '../hooks/useAnimateAction';
import { useModalManager } from '../hooks/useModalManager';
import { useTurnManager } from '../hooks/useTurnManager';
import { usePeer } from '../hooks/usePeer';
import type { PeerMessage } from '../hooks/usePeer';
import { flipGameStatePerspective } from '../utils/gameStatePerspective';
import { GameBoard } from './GameBoard';
import { saveGame, type LoadedSave } from '../utils/saveGame';
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

  const isRealtimeMP = multiplayerConfig?.transport === 'realtime';
  const isHost = !!multiplayerConfig?.isHost;

  // Always-fresh ref so gameState in async callbacks is never stale.
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // ── Refs for circular dependencies ─────────────────────────────────────
  // These are filled in after useTurnManager runs below.
  const advanceToPlayerTurnRef   = useRef<() => void>(() => {});
  const advanceToOpponentTurnRef = useRef<() => void>(() => {});

  // The onMessage handler references dispatch and the advance refs, which
  // aren't available until after usePeer and useTurnManager are declared.
  // We use a ref to break the circular dependency.
  const onMessageRef = useRef<(msg: PeerMessage) => void>(() => {});

  // ── P2P connection ───────────────────────────────────────────────────────
  // usePeer is always called (hooks can't be conditional).
  // When roomCode is '__noop__' the hook exits early and returns idle status.
  const { status: peerStatus, sendState, sendInitState } = usePeer({
    isHost,
    roomCode: multiplayerConfig?.roomCode ?? '__noop__',
    onMessage: (msg) => onMessageRef.current(msg),
  });

  // ── Pending-send pattern ─────────────────────────────────────────────────
  // onAsyncTurnEnd fires in the same React commit as the final DRAW_CARD
  // dispatch, so gameState is still stale at call time.
  // Setting pendingSend=true here + watching [pendingSend, gameState] in a
  // useEffect guarantees sendState runs AFTER the post-draw render.
  const [pendingSend, setPendingSend] = useState(false);

  useEffect(() => {
    if (!pendingSend) return;
    setPendingSend(false);
    sendState(gameStateRef.current);
  // gameState in deps ensures this runs after the state update settles.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSend, gameState, sendState]);

  // ── Turn end handler ─────────────────────────────────────────────────────
  // Declared before useTurnManager (TDZ: used as its onAsyncTurnEnd arg).
  const handleAsyncTurnEnd = useCallback(() => {
    if (isRealtimeMP) setPendingSend(true);
  }, [isRealtimeMP]);

  // ── Turn manager ─────────────────────────────────────────────────────────
  const turn = useTurnManager({
    gameState,
    dispatch,
    animate: animations.animate,
    setAnimatingAction: animations.setAnimatingAction,
    resetAnimations: animations.resetAnimations,
    initialTurnPhase: initialTurnPhase ?? initialState?.turnPhase,
    onAsyncTurnEnd: isRealtimeMP ? handleAsyncTurnEnd : undefined,
  });

  // Wire advance refs now that turn is available.
  advanceToPlayerTurnRef.current   = turn.advanceToPlayerTurn;
  advanceToOpponentTurnRef.current = turn.advanceToOpponentTurn;

  // Wire the onMessage handler now that both dispatch and advance refs are ready.
  onMessageRef.current = useCallback((msg: PeerMessage) => {
    const flipped = flipGameStatePerspective(msg.gameState);
    dispatch({ type: 'REPLACE_STATE', state: flipped });
    if (msg.type === 'INIT_STATE') {
      // If guest goes first, guest advances to player turn.
      // If host goes first, guest stays on 'opponent' (waiting).
      if (msg.guestGoesFirst && !isHost) {
        advanceToPlayerTurnRef.current();
      }
      // The host's turn phase is set separately in the INIT_STATE send effect below.
    } else {
      // GAME_STATE: the sender just finished their turn — it's now our turn.
      advanceToPlayerTurnRef.current();
    }
  // dispatch is stable; isHost is stable for session lifetime.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost]);

  // ── Host sends INIT_STATE once when guest connects ───────────────────────
  const didSendInit = useRef(false);
  useEffect(() => {
    if (!isRealtimeMP || !isHost) return;
    if (peerStatus !== 'connected') return;
    if (didSendInit.current) return;
    didSendInit.current = true;

    const guestFirst = Math.random() < 0.5;
    sendInitState(gameStateRef.current, guestFirst);
    if (guestFirst) {
      // Host waits while guest plays first.
      advanceToOpponentTurnRef.current();
    }
    // else: host is already on 'player' turn (default initialTurnPhase).
  }, [peerStatus, isRealtimeMP, isHost, sendInitState]);

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    saveGame(gameState, turn.currentTurn);
  }, [gameState, turn.currentTurn]);

  return (
    <GameContext.Provider value={{
      gameState,
      dispatch,
      onExit,
      currentTurn:               turn.currentTurn,
      turnMessage:               turn.turnMessage,
      toastMessage:              turn.toastMessage,
      handleCardClick:           turn.handleCardClick,
      handleFlagClick:           turn.handleFlagClick,
      handleDeckDraw:            turn.handleDeckDraw,
      handleNewGame:             turn.handleNewGame,
      handleOpponentCardClick:   turn.handleOpponentCardClick,
      handleRedeployConfirm:     turn.handleRedeployConfirm,
      handleScoutDraw:           turn.handleScoutDraw,
      handleScoutChoose:         turn.handleScoutChoose,
      handleScoutDiscard:        turn.handleScoutDiscard,
      handleTacticsConfigConfirm: turn.handleTacticsConfigConfirm,
      handleTacticsCancel:       turn.handleTacticsCancel,
      handleTraitorPlace:        turn.handleTraitorPlace,
      handleCardDrop:            turn.handleCardDrop,
      handleSwapCards:           turn.handleSwapCards,
      handleSortHand:            turn.handleSortHand,
      handleSave,
      flyingCard:      animations.flyingCard,
      flyFrom:         animations.flyFrom,
      flyTo:           animations.flyTo,
      animatingAction: animations.animatingAction,
      onFlyComplete:   animations.handleFlyComplete,
      showRules:  modals.showRules,
      showGuide:  modals.showGuide,
      showStats:  modals.showStats,
      rulesTab:   modals.rulesTab,
      setRulesTab: modals.setRulesTab,
      openRules:  modals.openRules,
      openGuide:  modals.openGuide,
      openStats:  modals.openStats,
      closeRules: modals.closeRules,
      closeGuide: modals.closeGuide,
      closeStats: modals.closeStats,
      multiplayerConfig,
      peerStatus,
      advanceToPlayerTurn: turn.advanceToPlayerTurn,
    }}>
      <GameBoard />
    </GameContext.Provider>
  );
}
