import { useState, useRef, useCallback, useEffect } from 'react';
import type { Dispatch } from 'react';
import type { Card as CardType, CardColor, CardValue, GameState } from '../types/game';
import type { GameAction } from '../engine/gameEngine';
import type { Move } from '../types/Move';
import { useOpponentAI } from './useOpponentAI';
import type { ActionToAnimate } from './useAnimateAction';

export type TurnPhase = 'player' | 'opponent' | 'awaitingDraw';

interface UseTurnManagerParams {
  gameState: GameState;
  dispatch: Dispatch<GameAction>;
  animate: (action: ActionToAnimate, onComplete: () => void) => void;
  setAnimatingAction: (action: 'PLAY_CARD' | 'DRAW_CARD' | null) => void;
  resetAnimations: () => void;
  initialTurnPhase?: TurnPhase;
}

/**
 * Manages the full turn lifecycle:
 *   player plays card → player draws → opponent plays → opponent draws → repeat
 *
 * For DRAW_CARD, the dispatch happens in the animation's onComplete callback so
 * the card is never in the DOM before the fly animation finishes (no flash).
 */
export function useTurnManager({
  gameState,
  dispatch,
  animate,
  setAnimatingAction,
  resetAnimations,
  initialTurnPhase,
}: UseTurnManagerParams) {
  const [currentTurn, setCurrentTurn] = useState<TurnPhase>(initialTurnPhase ?? 'player');
  const [playerMoveDraft, setPlayerMoveDraft] = useState<Partial<Move>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Cleanup timer on unmount.
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  // Always-fresh ref to gameState so async callbacks never read stale closures.
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Always-fresh ref to runTurn to break circular useCallback dependency.
  const runTurnRef = useRef<(move: Omit<Move, 'tacticParams' | 'drawnCard'>) => void>(() => {});

  // Always-fresh ref to currentTurn so event-handler callbacks don't read stale state.
  const currentTurnRef = useRef<TurnPhase>(currentTurn);
  currentTurnRef.current = currentTurn;

  const { getMove } = useOpponentAI();

  // --- Animate a draw, then dispatch on completion ---
  // The card is NOT added to the hand until after the animation finishes, so it
  // never briefly appears at the destination before the fly reaches it.
  const scheduleDrawAnim = useCallback((
    player: 'player' | 'opponent',
    deckType: 'troop' | 'tactic',
    onComplete: () => void,
  ) => {
    const sourceDeck = deckType === 'troop' ? gameStateRef.current.deck : gameStateRef.current.tacticsDeck;
    const card = sourceDeck[0];
    if (!card) { onComplete(); return; }

    setAnimatingAction('DRAW_CARD');
    animate(
      { type: 'DRAW_CARD', deckType, player, card },
      () => {
        dispatch({ type: 'DRAW_CARD', deckType, player });
        setAnimatingAction(null);
        onComplete();
      },
    );
  }, [animate, dispatch, setAnimatingAction]);

  // --- Plays a card with fly animation, then dispatches the action ---
  const updateGameBoard = useCallback((
    move: Omit<Move, 'tacticParams' | 'drawnCard'>,
    onComplete: () => void,
  ) => {
    const animAction: ActionToAnimate = move.action === 'useTactic'
      ? { type: 'APPLY_TACTIC', card: move.card, flagIndex: move.flagIndex, player: move.player }
      : { type: 'PLAY_CARD', card: move.card, flagIndex: move.flagIndex, player: move.player };

    setAnimatingAction('PLAY_CARD');
    animate(animAction, () => {
      if (move.action === 'useTactic') {
        dispatch({ type: 'APPLY_TACTIC', card: move.card, flagIndex: move.flagIndex });
      } else {
        dispatch({ type: 'PLAY_CARD', card: move.card, flagIndex: move.flagIndex, player: move.player });
      }
      setAnimatingAction(null);
      onComplete();
    });
  }, [animate, dispatch, setAnimatingAction]);

  // --- Opponent draw phase ---
  const drawPhase = useCallback((
    player: 'player' | 'opponent',
    actionType: 'playCard' | 'useTactic',
  ) => {
    const deckType = actionType === 'useTactic' ? 'tactic' : 'troop';
    scheduleDrawAnim(player, deckType, () => {
      if (player === 'opponent') setCurrentTurn('player');
    });
  }, [scheduleDrawAnim]);

  // --- Execute one full move (play card + draw) ---
  const runTurn = useCallback((move: Omit<Move, 'tacticParams' | 'drawnCard'>) => {
    setCurrentTurn(move.player);
    updateGameBoard(move, () => {
      if (move.player === 'player') {
        const gs = gameStateRef.current;
        if (gs.deck.length === 0 && gs.tacticsDeck.length === 0) {
          // Both decks exhausted — skip draw phase, hand off to opponent immediately.
          showToast('Both decks are empty — draw phase skipped.');
          setCurrentTurn('opponent');
          const oppMove = getMove(gs.opponentHand, gs.flags, gs.deck);
          if (oppMove) runTurnRef.current({ ...oppMove, player: 'opponent', action: 'playCard' });
          else setCurrentTurn('player'); // opponent also has nothing to play
        } else {
          setCurrentTurn('awaitingDraw');
        }
      } else {
        drawPhase('opponent', move.action);
      }
    });
  }, [updateGameBoard, drawPhase, getMove, showToast]);

  // Keep ref fresh every render (avoids circular useCallback dependency in closures).
  runTurnRef.current = runTurn;

  // --- Player interactions ---
  const handleCardClick = useCallback((card: CardType) => {
    const isSelected = gameStateRef.current.selectedCard?.id === card.id;
    dispatch({ type: 'SELECT_CARD', card: isSelected ? null : card });
    setPlayerMoveDraft(isSelected ? {} : { card });
  }, [dispatch]);

  const finalizeMoveRequest = useCallback((draft: Partial<Move>) => {
    if (!draft.card || draft.flagIndex == null) return;
    if (currentTurnRef.current !== 'player') return;
    const { card, flagIndex } = draft;
    const flag = gameStateRef.current.flags[flagIndex];

    // Validate: won flag — no card may be played there.
    if (flag.winner) {
      showToast(`Flag ${flagIndex + 1} is already captured — choose a different flag.`);
      dispatch({ type: 'SELECT_CARD', card: null });
      dispatch({ type: 'SELECT_FLAG', flagIndex: null });
      setPlayerMoveDraft({});
      return;
    }

    // Validate: full flag — troop cards and wild tactic cards that occupy a slot.
    const occupiesSlot = card.type === 'troop' ||
      (card.type === 'tactic' &&
        (card.name === 'Leader' || card.name === 'Companion Cavalry' || card.name === 'Shield Bearers'));
    if (occupiesSlot) {
      const slots = flag.modifiers.includes('mud') ? 4 : 3;
      if (flag.formation.player.cards.length >= slots) {
        showToast(`Flag ${flagIndex + 1} is already full — choose a different flag.`);
        dispatch({ type: 'SELECT_CARD', card: null });
        dispatch({ type: 'SELECT_FLAG', flagIndex: null });
        setPlayerMoveDraft({});
        return;
      }
    }

    runTurnRef.current({
      player: 'player',
      action: card.type === 'tactic' ? 'useTactic' : 'playCard',
      card,
      flagIndex,
    });
    setPlayerMoveDraft({});
  }, [dispatch, showToast]);

  const handleFlagClick = useCallback((flagIndex: number) => {
    if (gameStateRef.current.pendingTraitor) {
      dispatch({ type: 'TRAITOR_PLACE', toFlagIndex: flagIndex });
      return;
    }
    if (playerMoveDraft.card) {
      setPlayerMoveDraft({});
      finalizeMoveRequest({ ...playerMoveDraft, flagIndex });
    } else {
      const alreadySelected = gameStateRef.current.selectedFlag === flagIndex;
      dispatch({ type: 'SELECT_FLAG', flagIndex: alreadySelected ? null : flagIndex });
    }
  }, [playerMoveDraft, dispatch, finalizeMoveRequest]);

  // --- Player draws from deck (ends player turn, starts opponent turn) ---
  const handleDeckDraw = useCallback((deckType: 'troop' | 'tactic') => {
    if (currentTurnRef.current !== 'awaitingDraw') return;

    const sourceDeck = deckType === 'troop' ? gameStateRef.current.deck : gameStateRef.current.tacticsDeck;
    if (sourceDeck.length === 0) return;

    scheduleDrawAnim('player', deckType, () => {
      setCurrentTurn('opponent');
      const gs = gameStateRef.current;
      const oppMove = getMove(gs.opponentHand, gs.flags, gs.deck);
      if (oppMove) {
        runTurnRef.current({ ...oppMove, player: 'opponent', action: 'playCard' });
      } else {
        // Opponent has no valid moves — skip their turn.
        setCurrentTurn('player');
      }
    });
  }, [scheduleDrawAnim, getMove]);

  // --- New game ---
  const handleNewGame = useCallback(() => {
    dispatch({ type: 'RESET_GAME' });
    setPlayerMoveDraft({});
    setCurrentTurn('player');
    resetAnimations();
  }, [dispatch, resetAnimations]);

  // --- Tactic interactions ---
  const handleOpponentCardClick = useCallback((card: CardType, flagIndex: number) => {
    if (gameStateRef.current.deserterActive) {
      dispatch({ type: 'DESERTER_DISCARD', card, flagIndex });
    } else if (gameStateRef.current.traitorActive) {
      dispatch({ type: 'TRAITOR_CAPTURE', card, flagIndex });
    }
  }, [dispatch]);

  const handleRedeployConfirm = useCallback((
    sourceFlagIndex: number,
    cardIndex: number,
    destinationFlagIndex: number | null,
  ) => {
    if (destinationFlagIndex != null) {
      dispatch({ type: 'REDEPLOY_CARD', sourceFlagIndex, cardIndex, destinationFlagIndex });
    } else {
      dispatch({ type: 'REDEPLOY_DISCARD', sourceFlagIndex, cardIndex });
    }
  }, [dispatch]);

  const handleScoutDraw = useCallback((deckType: 'troop' | 'tactic') => {
    dispatch({ type: 'SCOUT_DRAW', from: deckType });
  }, [dispatch]);

  const handleScoutChoose = useCallback((card: CardType) => {
    dispatch({ type: 'SCOUT_PICK', chosen: card });
  }, [dispatch]);

  const handleScoutDiscard = useCallback((card: CardType) => {
    const { discards } = gameStateRef.current.scoutDrawStep || {};
    if (!discards) return;
    const newOrder = [card, ...discards.filter(c => c.id !== card.id)];
    if (newOrder.length === 2) {
      dispatch({ type: 'SCOUT_DISCARD_ORDER', discards: [newOrder[0], newOrder[1]] });
    }
  }, [dispatch]);

  const handleTacticsConfigConfirm = useCallback((color: string, value: number) => {
    const gs = gameStateRef.current;
    const c = color as CardColor;
    const v = value as CardValue;

    if (gs.leaderPending) {
      dispatch({ type: 'SET_LEADER_CARD', color: c, value: v });
      return;
    }
    if (gs.companionPending) {
      dispatch({ type: 'SET_COMPANION_CARD', color: c, value: 8 as CardValue });
      return;
    }
    if (gs.shieldPending) {
      dispatch({ type: 'SET_SHIELD_BEARERS_CARD', color: c, value: v });
      return;
    }

    const pending = gs.pendingTactics;
    if (!pending?.card.name) return;
    dispatch({
      type: 'APPLY_TACTIC',
      card: { ...pending.card, color: c, value: v },
      flagIndex: pending.flagIndex,
    });
    dispatch({ type: 'CLEAR_PENDING_TACTIC' });
  }, [dispatch]);

  const handleTacticsCancel = useCallback(() => {
    dispatch({ type: 'CANCEL_TACTIC_CONFIG' });
    dispatch({ type: 'CANCEL_REDEPLOY' });
  }, [dispatch]);

  const handleTraitorPlace = useCallback((toFlagIndex: number) => {
    dispatch({ type: 'TRAITOR_PLACE', toFlagIndex });
  }, [dispatch]);

  // Direct card+flag drop (used by drag-to-flag gesture; bypasses playerMoveDraft state).
  const handleCardDrop = useCallback((card: CardType, flagIndex: number) => {
    finalizeMoveRequest({ card, flagIndex });
  }, [finalizeMoveRequest]);

  const handleSwapCards = useCallback((fromId: string, toId: string) => {
    dispatch({ type: 'REORDER_HAND', fromId, toId });
  }, [dispatch]);

  const handleSortHand = useCallback((mode: 'value' | 'color') => {
    dispatch({ type: 'SORT_HAND', mode });
  }, [dispatch]);

  // --- Turn message ---
  const turnMessage =
    currentTurn === 'player'       ? 'Play a card' :
    currentTurn === 'awaitingDraw' ? 'Draw a card from either the tactics or troop deck' :
                                     "Opponent's turn...";

  return {
    currentTurn,
    turnMessage,
    toastMessage,
    handleCardClick,
    handleFlagClick,
    handleDeckDraw,
    handleNewGame,
    handleOpponentCardClick,
    handleRedeployConfirm,
    handleScoutDraw,
    handleScoutChoose,
    handleScoutDiscard,
    handleTacticsConfigConfirm,
    handleTacticsCancel,
    handleTraitorPlace,
    handleCardDrop,
    handleSwapCards,
    handleSortHand,
  };
}
