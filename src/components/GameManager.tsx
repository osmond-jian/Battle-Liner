import { useReducer, useState, useEffect, useRef } from 'react';
import { reducer, GameAction } from '../engine/gameEngine';
import { createInitialState } from '../engine/initialState';
import { GameBoard } from './GameBoard';
import { useOpponentAI } from '../hooks/useOpponentAI';
import { useAnimateAction, ActionToAnimate } from '../hooks/useAnimateAction';
import type { Card as CardType, CardColor, CardValue } from '../types/game';
import type { Move } from '../types/Move';
import type { GameState } from '../types/game';


type TurnPhase = 'player' | 'opponent' | 'awaitingDraw';


export function GameManager() {
  const [gameState, dispatch] = useReducer(reducer, createInitialState());
  const [flyingCard, setFlyingCard] = useState<CardType | null>(null);
  const [flyFrom, setFlyFrom] = useState({ x: 0, y: 0 });
  const [flyTo, setFlyTo] = useState({ x: 0, y: 0 });
  const [opponentCardToAnimate, setOpponentCardToAnimate] = useState<null | { card: CardType; flagIndex: number }>(null);
  const [onAnimationDone, setOnAnimationDone] = useState<(() => void) | null>(null);
  const [playerMoveDraft, setPlayerMoveDraft] = useState<Partial<Move>>({});
  const [currentTurn, setCurrentTurn] = useState<'player' | 'opponent' | 'awaitingDraw'>('player');
  const [animatingAction, setAnimatingAction] = useState<'PLAY_CARD'|'DRAW_CARD'|null>(null);


  const [showRules, setShowRules] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const { getMove } = useOpponentAI();

  const gameStateRef = useRef(gameState);

  const animateAction = useAnimateAction(
    gameStateRef,
    setFlyFrom,
    setFlyTo,
    setFlyingCard,
    setOnAnimationDone
  );

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const handleCardClick = (card: CardType) => {
    const isSelected = gameState.selectedCard?.id === card.id;
    dispatch({ type: 'SELECT_CARD', card: isSelected ? null : card });
    setPlayerMoveDraft(isSelected ? {} : { card });
  };

  const handleFlagClick = (flagIndex: number) => {
    if (gameState.pendingTraitor) {
      dispatch({ type: 'TRAITOR_PLACE', toFlagIndex: flagIndex });
      return;
    }
    if (playerMoveDraft.card) {
      const draft = { ...playerMoveDraft, flagIndex };
      setPlayerMoveDraft(draft);
      finalizeMoveRequest(draft);
    } else {
      dispatch({ type: 'SELECT_FLAG', flagIndex });
    }
  };

  const finalizeMoveRequest = (draft: Partial<Move>) => {
    if (!draft.card || draft.flagIndex == null) return;

    const move: Move = {
      player: 'player',
      action: draft.card.type === 'tactic' ? 'useTactic' : 'playCard',
      card: draft.card,
      flagIndex: draft.flagIndex,
    };

    runTurn(move);
    setPlayerMoveDraft({});
  };

  const runTurn = (move: { card: CardType; flagIndex: number; player: 'player'|'opponent'; action: 'playCard'|'useTactic' }) => {
    console.log('🏃 runTurn got move:', move);
    setCurrentTurn(move.player);
    updateGameBoard(move, () => {
      if (move.player === 'player') {
        setCurrentTurn('awaitingDraw');
      } else {
        drawPhase('opponent', move.action);
      }
    });
  };

  const drawPhase = (
    player: 'player' | 'opponent',
    actionType: 'playCard' | 'useTactic'
  ) => {
    const deckType = actionType === 'useTactic' ? 'tactic' : 'troop';

    // 1) update game state
    dispatch({ type: 'DRAW_CARD', deckType, player });

    // 2) build the animation action
    const action: ActionToAnimate = { type: 'DRAW_CARD', deckType, player };

    // 3) mark animating
    setAnimatingAction(action.type);

    // 4) **delay** the actual animation until after React re‐renders
    setTimeout(() => {
      animateAction(action, () => {
        // clear animating flag
        setAnimatingAction(null);
        // if opponent draw, hand turn back
        if (player === 'opponent') setCurrentTurn('player');
      });
    }, 0);
  };

  const updateGameBoard = (
    move: { card: CardType; flagIndex: number; player: 'player'|'opponent'; action: 'playCard'|'useTactic' },
    onComplete: () => void
  ) => {
    const action: ActionToAnimate = {
      type: move.action === 'useTactic' ? 'APPLY_TACTIC' : 'PLAY_CARD',
      card: move.card,
      flagIndex: move.flagIndex,
      player: move.player
    };

    setAnimatingAction('PLAY_CARD');  // Animation type can remain 'PLAY_CARD' visually

    animateAction(action, () => {
      if (move.action === 'useTactic') {
        dispatch({
          type: 'APPLY_TACTIC', // 👈 Correct action type!
          card: move.card,
          flagIndex: move.flagIndex
        });
      } else {
        dispatch({
          type: 'PLAY_CARD',
          card: move.card,
          flagIndex: move.flagIndex,
          player: move.player
        });
      }

      setAnimatingAction(null);
      onComplete();
    });
  };



  const handleAnimationComplete = () => {
    console.log('Animation complete called');
    
    // Use the stored callback if available
    if (onAnimationDone) {
      onAnimationDone();
    }
    
    // Handle opponent card animation if needed
    if (opponentCardToAnimate) {
      dispatch({ type: 'DRAW_CARD', deckType: 'troop', player: 'opponent' });
      setOpponentCardToAnimate(null);
    }
    
    // Clean up animation state
    setOnAnimationDone(null);
    setFlyingCard(null);
  };

  const handleNewGame = () => {
    dispatch({ type: 'RESET_GAME' });
    setPlayerMoveDraft({});
    setFlyingCard(null);
    setOpponentCardToAnimate(null);
    setOnAnimationDone(null);
    setCurrentTurn('player');
  };

  const handleDeckDraw = (deckType: 'troop'|'tactic') => {
    // 1) update game state
    dispatch({ type: 'DRAW_CARD', deckType, player: 'player' });

    // 2) build the animation action
    const action: ActionToAnimate = {
      type: 'DRAW_CARD',
      deckType,
      player: 'player'
    };

    // 3) mark that we’re animating a draw
    setAnimatingAction(action.type);

    // 4) run it with delay
    setTimeout(() => {
      animateAction(action, () => {
        // 5) clear the flag
        setAnimatingAction(null);

        // 6) now pass turn to opponent
        setCurrentTurn('opponent');
        const oppMove = getMove(
          gameStateRef.current.opponentHand,
          gameStateRef.current.flags,
          gameStateRef.current.deck
        );
        if (oppMove) runTurn({ ...oppMove, player: 'opponent', action: 'playCard' });
      });
    }, 0);
  };

  const handleRedeployConfirm = (sourceFlagIndex: number, cardIndex: number, destinationFlagIndex: number | null) => {
    if (destinationFlagIndex != null) {
      dispatch({ type: 'REDEPLOY_CARD', sourceFlagIndex, cardIndex, destinationFlagIndex });
    } else {
      dispatch({ type: 'CANCEL_REDEPLOY' });
    }
  };

  const handleScoutDraw = (deckType: 'troop' | 'tactic') => {
    dispatch({ type: 'SCOUT_DRAW', from: deckType });
  };

  const handleScoutChoose = (card: CardType) => {
    dispatch({ type: 'SCOUT_PICK', chosen: card });
  };

  const handleScoutDiscard = (card: CardType) => {
    const { discards } = gameState.scoutDrawStep || {};
    if (!discards) return;
    const newOrder = [card, ...discards.filter(c => c.id !== card.id)];
    if (newOrder.length === 2) {
      dispatch({ type: 'SCOUT_DISCARD_ORDER', discards: [newOrder[0], newOrder[1]] });
    }
  };

  const handleTacticsConfigConfirm = (color: string, value: number) => {
    const pending = gameState.pendingTactics;
    if (!pending) return;

    const cardName = pending.card.name;

    if (!cardName) return;

    if (cardName === 'Leader') {
      dispatch({
        type: 'SET_LEADER_CARD',
        color: color as CardColor,
        value: value as CardValue,
      });
    } else if (cardName === 'Companion Cavalry') {
      dispatch({
        type: 'SET_COMPANION_CARD',
        color: color as CardColor,
        value: value as CardValue,
      });
    } else {
      // fallback for future tactics that may use config
      dispatch({
        type: 'APPLY_TACTIC',
        card: {
          ...pending.card,
          color: color as CardColor,
          value: value as CardValue,
        },
        flagIndex: pending.flagIndex,
      });

      dispatch({ type: 'CLEAR_PENDING_TACTIC' });
    }
  };


  const handleTacticsCancel = () => {
    dispatch({ type: 'CLEAR_PENDING_TACTIC' });
    dispatch({ type: 'CANCEL_REDEPLOY' });
  };

  const handleTraitorPlace = (toFlagIndex: number) => {
    dispatch({ type: 'TRAITOR_PLACE', toFlagIndex });
  };

  const handleOpponentCardClick = (card: CardType, flagIndex: number) => {
    if (gameState.deserterActive) {
      dispatch({ type: 'DESERTER_DISCARD', card, flagIndex });
    } else if (gameState.traitorActive) {
      dispatch({ type: 'TRAITOR_CAPTURE', card, flagIndex });
    }
  };

  function getTurnMessage(turn: TurnPhase, state: GameState): string {
  if (turn === 'player') {
    return 'Play a card';
  }
  if (turn === 'awaitingDraw') {
    return 'Draw a card from either the tactics or troop deck';
  }
  if (turn === 'opponent') {
    return "Opponent's turn...";
  }
  return '';
}

  return (
    <GameBoard
      gameState={gameState}
      onCardClick={handleCardClick}
      onFlagClick={handleFlagClick}
      onShowRules={() => setShowRules(true)}
      onShowGuide={() => setShowGuide(true)}
      onShowStats={() => setShowStats(true)}
      flyingCard={flyingCard}
      animatingAction={animatingAction}
      flyFrom={flyFrom}
      flyTo={flyTo}
      onResetGame={handleNewGame}
      showRules={showRules}
      showGuide={showGuide}
      showStats={showStats}
      onCloseRules={() => setShowRules(false)}
      onCloseGuide={() => setShowGuide(false)}
      onCloseStats={() => setShowStats(false)}
      onOpponentCardClick={handleOpponentCardClick}
      onDeckDraw={handleDeckDraw}
      onScoutDraw={handleScoutDraw}
      onScoutChoose={handleScoutChoose}
      onScoutDiscard={handleScoutDiscard}
      onRedeployConfirm={handleRedeployConfirm}
      onTacticsConfigConfirm={handleTacticsConfigConfirm}
      onTacticsCancel={handleTacticsCancel}
      onTraitorPlace={handleTraitorPlace}
      onFlyComplete={handleAnimationComplete}
      turnMessage={getTurnMessage(currentTurn, gameState)}
    />
  );
}
