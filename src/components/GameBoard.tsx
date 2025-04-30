import React, { useState, useEffect } from 'react';
import { Card as CardType, Flag as FlagType, GameState } from '../types/game';
import { Flag } from './Flag';
import { Card } from './Card';
import { Deck } from './Deck';
import { 
  createDeck, 
  createFlags, 
  checkWinner, 
  checkGameOver,
  makeOpponentMove,
  TOTAL_CARDS
} from '../utils/gameLogic';

export function GameBoard() {
  const [deck, setDeck] = useState<CardType[]>([]);
  const [playerHand, setPlayerHand] = useState<CardType[]>([]);
  const [opponentHand, setOpponentHand] = useState<CardType[]>([]);
  const [flags, setFlags] = useState<FlagType[]>([]);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [selectedFlag, setSelectedFlag] = useState<number | null>(null);
  const [gameState, setGameState] = useState<GameState>('playing');

  const initializeGame = () => {
    const newDeck = createDeck();
    const playerInitialHand = newDeck.slice(0, 7);
    const opponentInitialHand = newDeck.slice(7, 14);
    const remainingDeck = newDeck.slice(14);

    setDeck(remainingDeck);
    setPlayerHand(playerInitialHand);
    setOpponentHand(opponentInitialHand);
    setFlags(createFlags());
    setSelectedCard(null);
    setSelectedFlag(null);
    setGameState('playing');
  };

  useEffect(() => {
    initializeGame();
  }, []);

  const drawCard = (isPlayer: boolean) => {
    if (deck.length === 0) return;
    
    const [newCard, ...remainingDeck] = deck;
    setDeck(remainingDeck);
    
    if (isPlayer) {
      setPlayerHand(prev => [...prev, newCard]);
    } else {
      setOpponentHand(prev => [...prev, newCard]);
    }
  };

  const playCard = (flagIndex: number) => {
    if (!selectedCard || gameState !== 'playing') return;

    const newFlags = [...flags];
    const flag = newFlags[flagIndex];

    if (flag.winner || flag.formation.player.cards.length >= 3) return;

    // Update player's formation
    flag.formation.player.cards.push(selectedCard);
    setPlayerHand(prev => prev.filter(card => card.id !== selectedCard.id));
    setSelectedCard(null);
    setSelectedFlag(null);

    // Check if this flag is won
    const flagWinner = checkWinner(flag);
    if (flagWinner) {
      flag.winner = flagWinner;
    }

    // Update flags and check game state
    setFlags(newFlags);
    const gameWinner = checkGameOver(newFlags);
    if (gameWinner) {
      setGameState(gameWinner === 'player' ? 'playerWon' : 'opponentWon');
      return;
    }

    // Opponent's turn
    const opponentMove = makeOpponentMove(newFlags, opponentHand, deck);
    if (opponentMove) {
      const { flagIndex: oppFlagIndex, card: oppCard } = opponentMove;
      
      newFlags[oppFlagIndex].formation.opponent.cards.push(oppCard);
      setOpponentHand(prev => prev.filter(card => card.id !== oppCard.id));
      
      const oppFlagWinner = checkWinner(newFlags[oppFlagIndex]);
      if (oppFlagWinner) {
        newFlags[oppFlagIndex].winner = oppFlagWinner;
      }
      
      setFlags(newFlags);
      
      const finalGameWinner = checkGameOver(newFlags);
      if (finalGameWinner) {
        setGameState(finalGameWinner === 'player' ? 'playerWon' : 'opponentWon');
      }
    }

    // Draw new cards
    drawCard(true);
    drawCard(false);
  };

  const handleCardClick = (card: CardType) => {
    if (selectedCard?.id === card.id) {
      setSelectedCard(null);
    } else {
      setSelectedCard(card);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      {/* Navigation */}
      <nav className="bg-gray-800 shadow-lg p-4 mb-8 rounded-lg border border-gray-700">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Battle Line</h1>
          <button
            onClick={initializeGame}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            New Game
          </button>
        </div>
      </nav>

      {/* Game Over Message */}
      {gameState !== 'playing' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-lg shadow-xl text-center border border-gray-700">
            <h2 className="text-3xl font-bold mb-4 text-white">
              {gameState === 'playerWon' ? 'Congratulations!' : 'Defeat!'}
            </h2>
            <p className="text-xl mb-4 text-gray-300">
              {gameState === 'playerWon' 
                ? 'You have won the battle!' 
                : 'The opponent has won the battle!'}
            </p>
            <button
              onClick={initializeGame}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              New Game
            </button>
            <button
              onClick={() => setGameState('playing')}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Game Board */}
      <div className="max-w-7xl mx-auto">
        {/* Opponent's Hand (face down) */}
        <div className="flex justify-center gap-2 mb-8">
          {opponentHand.map((_, i) => (
            <div
              key={i}
              className="w-20 h-32 bg-gray-800 rounded-lg shadow-md border-2 border-gray-700 relative overflow-hidden"
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-gray-700 rounded-full" />
              </div>
              <div className="absolute inset-0">
                <div className="w-full h-full bg-gradient-to-br from-gray-700/30 to-transparent" />
              </div>
            </div>
          ))}
        </div>

        {/* Deck and Flags */}
        <div className="flex justify-center gap-8 mb-8">
          <Deck cardsRemaining={deck.length} totalCards={TOTAL_CARDS} />
          <div className="flex gap-4">
            {flags.map((flag, index) => (
              <Flag
                key={flag.id}
                flag={flag}
                selected={selectedFlag === index}
                onCardPlace={() => {
                  if (selectedCard) {
                    playCard(index);
                  } else {
                    setSelectedFlag(index);
                  }
                }}
              />
            ))}
          </div>
        </div>

        {/* Player's Hand */}
        <div className="flex justify-center gap-2">
          {playerHand.map(card => (
            <Card
              key={card.id}
              card={card}
              selected={selectedCard?.id === card.id}
              onClick={() => handleCardClick(card)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}