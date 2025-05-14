import { useReducer, useState } from 'react';
import { Card as CardType } from '../types/game';
import { reducer, GameAction } from '../engine/gameEngine';
import { createInitialState } from '../engine/initialState';
import { useOpponentAI } from '../hooks/useOpponentAI';
import { ScoutDrawModal } from './ScoutDrawModal';
import { TacticsConfigModal } from './TacticalConfigModal';
import { RedeployModal } from './RedeployModal';
import { Card } from './Card';
import { CardBack } from './CardBack';
import { CardFly } from './CardFly';
import { RulesPopup } from './RulesPopup';
import { FormationGuide } from './FormationGuide';
import { DeckStats } from './DeckStats';
import { Deck } from './Deck';
import { Flag } from './Flag';

export function GameBoard() {
  const [gameState, dispatch] = useReducer(reducer, createInitialState());
  const [flyingCard, setFlyingCard] = useState<CardType | null>(null);
  const [flyFrom, setFlyFrom] = useState({ x: 0, y: 0 });
  const [flyTo, setFlyTo] = useState({ x: 0, y: 0 });
  const [queuedAction, setQueuedAction] = useState<GameAction | null>(null);
  const [opponentCardToAnimate, setOpponentCardToAnimate] = useState<{ card: CardType; flagIndex: number } | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const { getMove } = useOpponentAI();

  const handleResetGame = () => {
    dispatch({ type: 'RESET_GAME' as any });
    setFlyingCard(null);
    setQueuedAction(null);
    setOpponentCardToAnimate(null);
    setShowRules(false);
    setShowGuide(false);
    setShowStats(false);
  };

  const handleCardClick = (card: CardType) => {
    const isSelected = gameState.selectedCard?.id === card.id;
    dispatch({ type: 'SELECT_CARD', card: isSelected ? null : card });
  };

  const handleOpponentCardClick = (card: CardType, flagIndex: number) => {
    if (gameState.deserterActive) {
      dispatch({ type: 'DESERTER_DISCARD', card, flagIndex });
    } else if (gameState.traitorActive) {
      dispatch({ type: 'TRAITOR_CAPTURE', card, flagIndex });
    }
  };

  const handleFlagClick = (flagIndex: number) => {
    if (gameState.pendingTraitor) {
      dispatch({ type: 'TRAITOR_PLACE', toFlagIndex: flagIndex });
      return;
    }

    if (gameState.selectedCard) {
      const card = gameState.selectedCard;
      const cardEl = document.getElementById(`card-${card.id}`);
      const flagEl = document.getElementById(`flag-${flagIndex}`);

      if (cardEl && flagEl) {
        const from = cardEl.getBoundingClientRect();
        const to = flagEl.getBoundingClientRect();
        setFlyFrom({ x: from.left, y: from.top });
        setFlyTo({ x: to.left, y: to.top });
        setFlyingCard(card);
        setQueuedAction({ type: 'PLAY_CARD', card, flagIndex });
      } else {
        dispatch({ type: 'PLAY_CARD', card, flagIndex });
      }

      dispatch({ type: 'SELECT_CARD', card: null });
    } else {
      dispatch({ type: 'SELECT_FLAG', flagIndex });
    }
  };

  const handleScoutDraw = (deckType: 'troop' | 'tactic') => {
    dispatch({ type: 'SCOUT_DRAW', from: deckType });
  };

  const handleScoutChoose = (card: CardType) => {
    dispatch({ type: 'SCOUT_PICK', chosen: card });
  };

  const handleScoutDiscard = (selectedCard: CardType) => {
    const discards = gameState.scoutDrawStep?.discards;
    if (discards && discards.length === 2) {
      const [first, second] = discards;
      const ordered: [CardType, CardType] = first.id === selectedCard.id ? [first, second] : [second, first];
      dispatch({ type: 'SCOUT_DISCARD_ORDER', discards: ordered });
    }
  };

  const triggerOpponentMove = () => {
    const move = getMove(gameState.opponentHand, gameState.flags, gameState.deck);
    if (move) {
      const oppEl = document.getElementById(`opponent-hand`);
      const flagEl = document.getElementById(`flag-${move.flagIndex}`);

      if (oppEl && flagEl) {
        const from = oppEl.getBoundingClientRect();
        const to = flagEl.getBoundingClientRect();
        setFlyFrom({ x: from.left + from.width / 2, y: from.top });
        setFlyTo({ x: to.left, y: to.top });
        setFlyingCard(move.card);
        setQueuedAction({ type: 'PLAY_CARD', card: move.card, flagIndex: move.flagIndex });
        setOpponentCardToAnimate(move);
      } else {
        dispatch({ type: 'PLAY_CARD', card: move.card, flagIndex: move.flagIndex });
        dispatch({ type: 'DRAW_CARD', deckType: 'troop' });
      }
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 space-y-6">
      {/* Navigation */}
    <nav className="flex justify-between items-center p-4 rounded-lg bg-gray-800 border border-gray-700">
      <h1 className="text-2xl font-bold">Battle Line</h1>
      <div className="flex gap-2">
        <button
          onClick={() => setShowRules(true)}
          className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded shadow transition"
        >
          Rules
        </button>
        <button
          onClick={() => setShowGuide(true)}
          className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded shadow transition"
        >
          Formation Strength
        </button>
        <button
          onClick={handleResetGame}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition"
        >
          New Game
        </button>
      </div>
    </nav>

    <div className="w-full flex items-start px-4 mt-4">
      {/* Left spacer */}
      <div className="w-1/3" />

      {/* Centered opponent hand */}
      <div className="w-1/3 flex justify-center">
        <div id="opponent-hand" className="flex gap-2">
          {gameState.opponentHand.map((card) => (
            <CardBack key={card.id} variant="troop" />
          ))}
        </div>
      </div>

      {/* Right-aligned buttons */}
      <div className="w-1/3 flex justify-end gap-2">
        <button
          onClick={() => setShowRules(true)}
          className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded shadow transition"
        >
          Rules
        </button>
        <button
          onClick={() => setShowGuide(true)}
          className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded shadow transition"
        >
          Formations
        </button>
        <button
          onClick={() => setShowStats(true)}
          className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded shadow transition"
        >
          Deck Stats
        </button>
      </div>
    </div>



    <div className="flex justify-center gap-8 items-start w-full px-4">
      {/* Troop Deck (left) */}
      <div className="flex flex-col items-center gap-2">
        <Deck cardsRemaining={gameState.deck.length} />
        <button
          onClick={() => dispatch({ type: 'DRAW_CARD', deckType: 'troop' })}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition"
        >
          Draw Troop
        </button>
      </div>

      {/* Flags Grid (center) */}
      <div className="flex flex-wrap justify-center gap-4 w-full">
        {gameState.flags.map((flag, i) => (
          <Flag
            key={flag.id}
            flag={flag}
            flagIndex={i}
            selected={gameState.selectedFlag === i}
            onCardPlace={() => handleFlagClick(i)}
            deserterActive={gameState.deserterActive}
            traitorActive={gameState.traitorActive}
            onDeserterSelect={handleOpponentCardClick}
            onTraitorSelect={handleOpponentCardClick}
            pendingTraitor={gameState.pendingTraitor}
            onTraitorDestination={(toFlagIndex) =>
              dispatch({ type: 'TRAITOR_PLACE', toFlagIndex })
            }
          />
        ))}
      </div>

      {/* Tactics Deck (right) */}
      <div className="flex flex-col items-center gap-2">
        <Deck cardsRemaining={gameState.tacticsDeck.length} variant="tactic" />
        <button
          onClick={() => dispatch({ type: 'DRAW_CARD', deckType: 'tactic' })}
          className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded shadow transition"
        >
          Draw Tactic
        </button>
      </div>
    </div>


      {/* Player Hand */}
      <div id="hand" className="flex justify-center flex-wrap gap-2 mt-6">
        {gameState.playerHand.map(card => (
          <Card
            key={card.id}
            id={`card-${card.id}`}
            card={card}
            onClick={() => handleCardClick(card)}
            selected={gameState.selectedCard?.id === card.id}
          />
        ))}
      </div>


      {/* Victory Overlay */}
      {gameState.gameStatus !== 'playing' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-600 text-center">
            <h2 className="text-3xl font-bold mb-2">
              {gameState.gameStatus === 'playerWon' ? 'Victory!' : 'Defeat'}
            </h2>
            <p className="text-gray-300 mb-4">
              {gameState.gameStatus === 'playerWon' ? 'You have won the battle.' : 'The opponent has prevailed.'}
            </p>
            <button onClick={handleResetGame} className="btn-blue">Play Again</button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showRules && <RulesPopup onClose={() => setShowRules(false)} />}
      {showGuide && <FormationGuide onClose={() => setShowGuide(false)} />}
      {showStats && (
        <DeckStats
          onClose={() => setShowStats(false)}
          deck={gameState.deck}
          playerHand={gameState.playerHand}
          opponentHand={gameState.opponentHand}
          flags={gameState.flags}
        />
      )}
      
        {gameState.redeployState && (
        <RedeployModal
            flags={gameState.flags}
            onCancel={() => dispatch({ type: 'CANCEL_REDEPLOY' })}
            onConfirm={(sourceFlagIndex, cardIndex, destinationFlagIndex) => {
            if (destinationFlagIndex == null) return; // safety check
            dispatch({
                type: 'REDEPLOY_CARD',
                sourceFlagIndex,
                cardIndex,
                destinationFlagIndex,
            });
            }}
        />
        )}


        {gameState.pendingTactics?.card?.name && gameState.pendingTactics.flagIndex != null && (
        <TacticsConfigModal
            cardName={gameState.pendingTactics.card.name}
            onConfirm={(color, value) => {
            const configured = {
                ...gameState.pendingTactics!.card,
                color,
                value,
            };
            dispatch({
                type: 'PLAY_CARD',
                card: configured,
                flagIndex: gameState.pendingTactics!.flagIndex,
            });
            dispatch({ type: 'CLEAR_PENDING_TACTIC' });
            }}
            onCancel={() => dispatch({ type: 'CLEAR_PENDING_TACTIC' })}
        />
        )}


      {gameState.scoutDrawStep && (
        <ScoutDrawModal
          drawn={gameState.scoutDrawStep.drawn}
          remaining={gameState.scoutDrawStep.remaining}
          keep={gameState.scoutDrawStep.keep}
          discards={gameState.scoutDrawStep.discards}
          onDrawFromTroop={() => handleScoutDraw('troop')}
          onDrawFromTactic={() => handleScoutDraw('tactic')}
          onPickFinal={handleScoutChoose}
          onDiscardSelect={handleScoutDiscard}
          onCancel={() => dispatch({ type: 'CLEAR_PENDING_TACTIC' })}
        />
      )}

      {flyingCard && (
        <CardFly
          card={flyingCard}
          from={flyFrom}
          to={flyTo}
          onComplete={() => {
            if (queuedAction) dispatch(queuedAction);
            if (opponentCardToAnimate) {
              dispatch({ type: 'DRAW_CARD', deckType: 'troop' });
              setOpponentCardToAnimate(null);
            } else {
              setTimeout(() => triggerOpponentMove(), 500);
            }
            setFlyingCard(null);
            setQueuedAction(null);
          }}
        />
      )}

      {/* Tactic Prompts */}
      {gameState.deserterActive && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow">
          Deserter Active: Click an opponent card to remove
        </div>
      )}
      {gameState.traitorActive && (
        <div className="fixed top-4 right-4 bg-yellow-500 text-black px-4 py-2 rounded shadow">
          Traitor Active: Click an opponent troop to convert
        </div>
      )}
      {gameState.pendingTraitor && (
        <div className="text-center text-yellow-300 font-medium mt-4">
          Select a flag to place the captured card: {gameState.pendingTraitor.card.name}
        </div>
      )}
    </div>
  );
}
