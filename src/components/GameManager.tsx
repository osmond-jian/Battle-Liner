import { useReducer, useState, useEffect, useRef } from 'react';
import { reducer } from '../engine/gameEngine';
import { createInitialState } from '../engine/initialState';
import { GameBoard } from './GameBoard';
import { useOpponentAI } from '../hooks/useOpponentAI';
import type { Card as CardType, CardColor, CardValue } from '../types/game';
import type { GameAction } from '../engine/gameEngine';
import type { Move } from '../types/Move';

export function GameManager() {
  const [gameState, dispatch] = useReducer(reducer, createInitialState());
  const [flyingCard, setFlyingCard] = useState<CardType | null>(null);
  const [flyFrom, setFlyFrom] = useState({ x: 0, y: 0 });
  const [flyTo, setFlyTo] = useState({ x: 0, y: 0 });
  const [opponentCardToAnimate, setOpponentCardToAnimate] = useState<null | { card: CardType; flagIndex: number }>(null);
  const [onAnimationDone, setOnAnimationDone] = useState<(() => void) | null>(null);
  const [playerMoveDraft, setPlayerMoveDraft] = useState<Partial<Move>>({});
  const [currentTurn, setCurrentTurn] = useState<'player' | 'opponent' | 'awaitingDraw'>('player');

  const [showRules, setShowRules] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const { getMove } = useOpponentAI();

  const gameStateRef = useRef(gameState);

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

  const runTurn = (move: Move) => {
    setCurrentTurn(move.player);
    playPhase(move, () => {
      if (move.player === 'player') {
        setCurrentTurn('awaitingDraw'); // Wait for manual deck pick
      } else {
        drawPhase('opponent', move.action);
        setTimeout(() => setCurrentTurn('player'), 500);
      }
    });
  };

  const playPhase = (move: Move, onComplete: () => void) => {
    updateGameBoard(move, () => {
      onComplete();
    });
  };

  const drawPhase = (player: 'player' | 'opponent', action: 'playCard' | 'useTactic') => {
    const deckType = action === 'useTactic' ? 'tactic' : 'troop';
    dispatch({ type: 'DRAW_CARD', deckType, player });

    if (player === 'player') {
      // turn will pass only after draw
      setTimeout(() => {
        setCurrentTurn('opponent');
        const oppMove = getMove(
          gameStateRef.current.opponentHand,
          gameStateRef.current.flags,
          gameStateRef.current.deck
        );
        if (oppMove) runTurn({ ...oppMove, player: 'opponent', action: 'playCard' });
      }, 500);
    }
  };

  const updateGameBoard = (move: Move, onComplete: () => void) => {
      console.log('Animating move:', move);
    const sourceId = move.player === 'player' ? `card-${move.card.id}` : 'opponent-hand';
    const cardEl = document.getElementById(sourceId);
    const flagEl = document.getElementById(`flag-${move.flagIndex}`);
    if (!cardEl || !flagEl) return;

    const from = cardEl.getBoundingClientRect();
    const to = flagEl.getBoundingClientRect();

    setFlyFrom({ x: from.left, y: from.top });
    setFlyTo({ x: to.left, y: to.top });
    setFlyingCard(move.card);
    setOnAnimationDone(() => () => {
      dispatch({ type: 'PLAY_CARD', card: move.card, flagIndex: move.flagIndex, player: move.player });
      setFlyingCard(null);
      onComplete();
    });
    console.log('Flying from', from, 'to', to);
  };

  const handleAnimationComplete = () => {
    if (onAnimationDone) onAnimationDone();
    if (opponentCardToAnimate) {
      dispatch({ type: 'DRAW_CARD', deckType: 'troop', player:'opponent' });
      setOpponentCardToAnimate(null);
    }
    setFlyingCard(null);
    setOnAnimationDone(null);
  };

  const handleNewGame = () => {
    dispatch({ type: 'RESET_GAME' });
    setPlayerMoveDraft({});
    setFlyingCard(null);
    setOpponentCardToAnimate(null);
    setOnAnimationDone(null);
    setCurrentTurn('player');
  };

  const handleDeckDraw = (deckType: 'troop' | 'tactic') => {
    dispatch({ type: 'DRAW_CARD', deckType, player:'player' });
    if (deckType === 'troop') setTimeout(() => triggerOpponentMove(), 500);
  };

  const triggerOpponentMove = () => {
    const move = getMove(gameState.opponentHand, gameState.flags, gameState.deck);
    if (!move) return;
    updateGameBoard(move, () => {
      dispatch({ type: 'DRAW_CARD', deckType: 'troop', player:'opponent' });
    });
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
    if (!gameState.pendingTactics?.flagIndex) return;
    dispatch({
      type: 'APPLY_TACTIC',
      card: {
        ...gameState.pendingTactics.card,
        color: color as CardColor,
        value: value as CardValue,
      },
      flagIndex: gameState.pendingTactics.flagIndex,
    });
    dispatch({ type: 'CLEAR_PENDING_TACTIC' });
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
