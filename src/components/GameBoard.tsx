import { useState, useEffect } from 'react';
import { Card as CardType, Flag as FlagType, GameState } from '../types/game';
import { Flag } from './Flag';
import { Card } from './Card';
import { Deck } from './Deck';
import { DeckStats } from './DeckStats';
import { CardBack } from './CardBack';
import { RulesPopup } from './RulesPopup';
import { FormationGuide } from './FormationGuide';
import { CardFly } from './CardFly';
import { useOpponentAI } from '../hooks/useOpponentAI';
import { TacticsConfigModal } from './TacticalConfigModal';
import { ScoutDrawModal } from './ScoutDrawModal';
import { RedeployModal } from './RedeployModal';

import {
  createDeck,
  createFlags,
  checkWinner,
  checkGameOver,
  createTacticsDeck,
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
  const [showGuide, setShowGuide] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const [flyingCard, setFlyingCard] = useState<CardType | null>(null);
  const [playerFlyFrom, setPlayerFlyFrom] = useState({ x: 0, y: 0 });
  const [playerFlyTo, setPlayerFlyTo] = useState({ x: 0, y: 0 });
  
  const [opponentFlyFrom, setOpponentFlyFrom] = useState({ x: 0, y: 0 });
  const [opponentFlyTo, setOpponentFlyTo] = useState({ x: 0, y: 0 });

  const [opponentPlayFrom, setOpponentPlayFrom] = useState({ x: 0, y: 0 });
  const [opponentPlayTo, setOpponentPlayTo] = useState({ x: 0, y: 0 });
  
  const [animatingPlay, setAnimatingPlay] = useState<null | { card: CardType; flagIndex: number }>(null);
  const [animatingOppCard, setAnimatingOppCard] = useState<null | {
    card: CardType;
    flagIndex: number;
    drawnCard: CardType | null;
    updatedDeck: CardType[];
  }>(null);
  const [animatingOppDraw, setAnimatingOppDraw] = useState<CardType | null>(null);

  const [tacticsDeck, setTacticsDeck] = useState<CardType[]>([]);
  const [playerTacticsPlayed, setPlayerTacticsPlayed] = useState<number>(0);
  const [opponentTacticsPlayed, setOpponentTacticsPlayed] = useState<number>(0);
  const [awaitingPlayerDraw, setAwaitingPlayerDraw] = useState(false);
  const [redeployState, setRedeployState] = useState(false);
  const [deserterActive, setDeserterActive] = useState<boolean>(false);
  const [traitorActive, setTraitorActive] = useState(false);
  const [traitorTargetCard, setTraitorTargetCard] = useState<CardType | null>(null);
  const [pendingTraitor, setPendingTraitor] = useState<{ card: CardType; fromFlag: number } | null>(null);




  const [scoutDrawStep, setScoutDrawStep] = useState<{
    drawn: CardType[];
    remaining: number;
    keep?: CardType;
    discards?: CardType[];
  } | null>(null);
  
  


  const [pendingTactics, setPendingTactics] = useState<{
    card: CardType;
    flagIndex: number;
  } | null>(null);
  

  const initializeGame = () => {
    const newDeck = createDeck();
    const playerInitialHand = newDeck.slice(0, 7);
    const opponentInitialHand = newDeck.slice(7, 14);
    const remainingDeck = newDeck.slice(14);
    const fullDeck = createDeck(); // troop deck
    const tactics = createTacticsDeck(); // write this util function
    
    setDeck(fullDeck);
    setTacticsDeck(tactics);
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

  const { getMove } = useOpponentAI();

  const playCard = (flagIndex: number) => {
    if (!selectedCard) return;
    const handEl = document.getElementById(`card-${selectedCard.id}`);
    const flagEl = document.getElementById(`flag-${flagIndex}`);

    if (handEl && flagEl) {
      const h = handEl.getBoundingClientRect();
      const f = flagEl.getBoundingClientRect();
      setPlayerFlyFrom({ x: h.left + window.scrollX, y: h.top + window.scrollY });
      setPlayerFlyTo({ x: f.left + window.scrollX, y: f.top + window.scrollY });
      setAnimatingPlay({ card: selectedCard, flagIndex });
      setSelectedCard(null);
      setSelectedFlag(null);
    } else {
      executePlayCard(flagIndex, selectedCard);
    }
  };

  const handleScoutDraw = (deckType: 'troop' | 'tactic') => {
    if (!scoutDrawStep || scoutDrawStep.remaining <= 0) return;
  
    const deckToDraw = deckType === 'troop' ? deck : tacticsDeck;
    if (deckToDraw.length === 0) return;
  
    const [card, ...rest] = deckToDraw;
  
    if (deckType === 'troop') setDeck(rest);
    else setTacticsDeck(rest);
  
    setScoutDrawStep({
      drawn: [...scoutDrawStep.drawn, card],
      remaining: scoutDrawStep.remaining - 1,
    });
  };
  
  const handleScoutChoose = (chosen: CardType) => {
    setPlayerHand(prev => [...prev, chosen]);
    setScoutDrawStep(prev =>
      prev ? { ...prev, keep: chosen, discards: prev.drawn.filter(c => c.id !== chosen.id) } : null
    );
    setPlayerTacticsPlayed(n => n + 1);
  };

  const handleScoutDiscardOrder = (selectedCard: CardType) => {
    if (!scoutDrawStep || !scoutDrawStep.discards) return;
  
    const [first, second] = scoutDrawStep.discards;
  
    const updatedDiscards = scoutDrawStep.discards[0].id === selectedCard.id
      ? [first, second]
      : [second, first];
  
    // Now insert them back to their respective decks (in reverse to preserve top order)
    updatedDiscards.slice().reverse().forEach(card => {
      if (card.type === 'troop') {
        setDeck(prev => [card, ...prev]);
      } else {
        setTacticsDeck(prev => [card, ...prev]);
      }
    });
  
    setPlayerHand(prev => [...prev, scoutDrawStep.keep!]);
    setScoutDrawStep(null);
    setPlayerTacticsPlayed(n => n + 1);
  };

  const animatedDrawCard = (isPlayer: boolean, card: CardType) => {
    const deckEl = document.getElementById('deck');
    const handEl = document.getElementById(isPlayer ? 'hand' : 'opponent-hand');
  
    if (deckEl && handEl) {
      const d = deckEl.getBoundingClientRect();
      const h = handEl.getBoundingClientRect();
  
      if (isPlayer) {
        setPlayerFlyFrom({ x: d.left + window.scrollX, y: d.top + window.scrollY });
        setPlayerFlyTo({ x: h.left + window.scrollX + h.width / 2 - 40, y: h.top + window.scrollY });
        setFlyingCard(card);
      } else {
        setOpponentFlyFrom({ x: d.left + window.scrollX, y: d.top + window.scrollY });
        setOpponentFlyTo({ x: h.left + window.scrollX + h.width / 2 - 30, y: h.top + window.scrollY });
        setAnimatingOppDraw(card);
      }
    } else {
      if (isPlayer) {
        setPlayerHand(prev => [...prev, card]);
      } else {
        setOpponentHand(prev => [...prev, card]);
      }
    }
  };

  const handleOpponentTurn = async (currentDeck: CardType[]) => {
    const move = getMove(opponentHand, flags, currentDeck);
    if (!move) return;
  
    const { card, flagIndex } = move;
    const [drawnCard, ...remainingDeck] = currentDeck;
  
    // Set up animation data — but do NOT mutate any game state yet
    const cardEl = document.getElementById(`opponent-card-${card.id}`);
    const flagEl = document.getElementById(`flag-${flagIndex}`);
    if (!cardEl || !flagEl) return;
  
    const from = cardEl.getBoundingClientRect();
    const to = flagEl.getBoundingClientRect();
  
    setOpponentPlayFrom({ x: from.left + window.scrollX, y: from.top + window.scrollY });
    setOpponentPlayTo({ x: to.left + window.scrollX, y: to.top + window.scrollY });
  
    // Start the animation — CardFly will handle the state change when it finishes
    setAnimatingOppCard({
      card,
      flagIndex,
      drawnCard: drawnCard ?? null,
      updatedDeck: remainingDeck,
    });
  };

  const drawFromDeck = async (deckType: 'troop' | 'tactic') => {
    const source = deckType === 'troop' ? deck : tacticsDeck;
    if (source.length === 0) return;
  
    const [card, ...rest] = source;
    if (deckType === 'troop') setDeck(rest);
    else setTacticsDeck(rest);
  
    await new Promise(res => {
      animatedDrawCard(true, card);
      setTimeout(res, 600);
    });
  };

  const handleTacticsEffect = (card: CardType, flagIndex: number) => {
    const updatedFlags = [...flags];
    const targetFlag = updatedFlags[flagIndex];
  
    if (card.name === 'Fog' && !targetFlag.modifiers.includes('fog')) {
      targetFlag.modifiers.push('fog');
    }
  
    if (card.name === 'Mud' && !targetFlag.modifiers.includes('mud')) {
      targetFlag.modifiers.push('mud');
    }

    if (card.name === 'Scout') {
      setScoutDrawStep({ drawn: [], remaining: 3 });
      return;
    }
    
    if (card.name === 'Redeploy') {
      setRedeployState(true);
    }

    if (card.name === 'Deserter') {
      setDeserterActive(true);
    }

    if (card.name === 'Traitor') {
      setTraitorActive(true);
      return;
    }

  
    setFlags(updatedFlags);
  };

  const handleDeserterTarget = (card: CardType, flagIndex: number) => {
    const updatedFlags = [...flags];
    const oppCards = updatedFlags[flagIndex].formation.opponent.cards;

    updatedFlags[flagIndex].formation.opponent.cards = oppCards.filter(c => c.id !== card.id);
    setFlags(updatedFlags);

    setOpponentTacticsPlayed(n => n + 1);
    setDeserterActive(false);
  };

  const handleTraitorSelect = (card: CardType, fromFlag: number) => {
    if (card.type !== 'troop') return; // Only troop cards are valid
    setPendingTraitor({ card, fromFlag });
    setTraitorActive(false); // Disable flag interaction temporarily
  };

  const handleTraitorDestination = (toFlagIndex: number) => {
    if (!pendingTraitor) return;

    const { card, fromFlag } = pendingTraitor;
    if (fromFlag === toFlagIndex) return;

    const newFlags = [...flags];

    // Remove from opponent
    newFlags[fromFlag].formation.opponent.cards = newFlags[fromFlag].formation.opponent.cards.filter(c => c.id !== card.id);

    // Add to player side of new flag (if not full)
    const targetFormation = newFlags[toFlagIndex].formation.player.cards;
    if (targetFormation.length >= 3) return;

    targetFormation.push(card);

    setFlags(newFlags);
    setPendingTraitor(null);
  };


  const executePlayCard = async (flagIndex: number, card: CardType) => {
    const newFlags = [...flags];
    const flag = newFlags[flagIndex];
  
    if (flag.formation.player.cards.length >= 3 || flag.winner) return;
  
    // Handle wild tactics (Leader, Shield Bearers, Companion Cavalry)
    if (
      card.type === 'tactic' &&
      ['Leader', 'Shield Bearers', 'Companion Cavalry'].includes(card.name || '')
    ) {
      setPendingTactics({ card, flagIndex });
      handleTacticsEffect(card, flagIndex);
      return;
    }
  
    // 1. Play the card
    flag.formation.player.cards.push(card);
    setPlayerHand(prev => prev.filter(c => c.id !== card.id));
    setFlags(newFlags);
  
    // 2. Check for flag winner
    const winner = checkWinner(flag, deck, opponentHand);
    if (winner) flag.winner = winner;
  
    // 3. Check for game winner
    const gameWinner = checkGameOver(newFlags);
    console.log("Checking win with flag winners:", newFlags.map(f => f.winner));
    if (gameWinner === 'player') {
      setGameState('playerWon');
      return;
    }
  
    // 4. Begin draw animation phase
    setAwaitingPlayerDraw(true);
  
    const [playerCard, ...deckAfterPlayerDraw] = deck;
    if (playerCard) {
      await new Promise(resolve => {
        animatedDrawCard(true, playerCard);
        setTimeout(resolve, 600);
      });
    }
  
    setDeck(deckAfterPlayerDraw);
    setAwaitingPlayerDraw(false);
  
    // 5. Opponent's turn
    await handleOpponentTurn(deckAfterPlayerDraw);
  };
  
  
  const canPlayTactic = (): boolean => {
    return playerHand.length < 7; // Or whatever condition you want for drawing Tactic cards
  };  
  
  return (
    <div className="min-h-screen bg-gray-900 p-4">
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

      {gameState !== 'playing' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-gray-800 p-8 rounded-lg shadow-xl border border-gray-700 w-80 text-center relative">
            <h2 className="text-3xl font-bold mb-4 text-white">
              {gameState === 'playerWon' ? 'Victory!' : 'Defeat!'}
            </h2>
            <p className="text-gray-300 mb-6">
              {gameState === 'playerWon' ? 'You won the battle!' : 'The opponent has won.'}
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={initializeGame}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                Play Again
              </button>
              <button
                onClick={() => setGameState('playing')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Fly Animations */}
      {flyingCard && (
        <CardFly card={flyingCard} from={playerFlyFrom} to={playerFlyTo} onComplete={() => {
          setPlayerHand(prev => [...prev, flyingCard]);
          setFlyingCard(null);
        }} />
      )}

      {animatingOppDraw && (
        <CardFly
          card={animatingOppDraw}
          from={opponentFlyFrom}
          to={opponentFlyTo}
          onComplete={() => {
            if (animatingOppDraw) {
              setOpponentHand(prev => [...prev, animatingOppDraw]);
            }
            setAnimatingOppDraw(null);
          }}
        />
      )}

      {animatingPlay && (
        <CardFly card={animatingPlay.card} from={playerFlyFrom} to={playerFlyTo} onComplete={() => {
          executePlayCard(animatingPlay.flagIndex, animatingPlay.card);
          setAnimatingPlay(null);
        }} />
      )}

      {animatingOppCard && (
        <CardFly
          card={animatingOppCard.card}
          from={opponentPlayFrom}
          to={opponentPlayTo}
          onComplete={() => {
            const { card, flagIndex, drawnCard, updatedDeck } = animatingOppCard!;

            // Now safely mutate state AFTER animation finishes
            const newFlags = [...flags];
            newFlags[flagIndex].formation.opponent.cards.push(card);
            setFlags(newFlags);
            setOpponentHand(prev => prev.filter(c => c.id !== card.id));

            const winner = checkWinner(newFlags[flagIndex], updatedDeck, opponentHand);
            if (winner) newFlags[flagIndex].winner = winner;

            const gameWinner = checkGameOver(newFlags);
            if (gameWinner === 'opponent') setGameState('opponentWon');

            setDeck(updatedDeck);
            setAnimatingOppCard(null);

            if (drawnCard) {
              setTimeout(() => {
                animatedDrawCard(false, drawnCard);
              }, 0);
            }
          }}
        />
      )}
      {/* Tactics Menu (to set rank/suit of tactics wild cards) */}
      {pendingTactics && (
        <TacticsConfigModal
          cardName={pendingTactics.card.name!}
          onConfirm={(color, value) => {
            const configuredCard = { ...pendingTactics.card, color, value };
            executePlayCard(pendingTactics.flagIndex, configuredCard);
            setPlayerTacticsPlayed(n => n + 1);
            setPlayerHand(prev => prev.filter(c => c.id !== pendingTactics.card.id));
            setPendingTactics(null);
          }}
          onCancel={() => setPendingTactics(null)}
        />
      )}
      {redeployState && (
        <RedeployModal
          flags={flags}
          onCancel={() => setRedeployState(false)}
          onConfirm={(sourceFlagIndex, cardIndex, destinationFlagIndex) => {
            const newFlags = [...flags];
            const [card] = newFlags[sourceFlagIndex].formation.player.cards.splice(cardIndex, 1);

            if (destinationFlagIndex !== null) {
              newFlags[destinationFlagIndex].formation.player.cards.push(card);
            }

            setFlags(newFlags);
            setRedeployState(false);
          }}
        />
      )}

      {deserterActive && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow">
          Deserter Active: Select an opponent's card to discard
        </div>
      )}

      {showGuide && <FormationGuide onClose={() => setShowGuide(false)} />}
      {showRules && <RulesPopup onClose={() => setShowRules(false)} />}
      {showStats && <DeckStats onClose={() => setShowStats(false)} deck={deck} playerHand={playerHand} opponentHand={opponentHand} flags={flags} />}

      <div className="max-w-7xl mx-auto flex justify-between gap-6">
        <div className="flex-1 space-y-8">
          <div id="opponent-hand" className="flex justify-center gap-2">
          {opponentHand.map(card => {
            const isBeingPlayed = animatingOppCard?.card.id === card.id;
            return (
              <CardBack
                key={card.id}
                id={`opponent-card-${card.id}`}
                style={isBeingPlayed ? { opacity: 0.01 } : {}}
              />
            );
          })}
          </div>
          <div className="flex items-center justify-center gap-6">
            <div id="deck" className="w-24 flex justify-center">
              <Deck cardsRemaining={deck.length} totalCards={TOTAL_CARDS} />
            </div>
            <div className="flex gap-4">
              {flags.map((flag, i) => (
                <div id={`flag-${i}`} key={flag.id}>
                <Flag
                  flag={flag}
                  selected={selectedFlag === i}
                  traitorActive={traitorActive}
                  onTraitorSelect={handleTraitorSelect}
                  pendingTraitor={pendingTraitor}
                  onTraitorDestination={handleTraitorDestination}
                  flagIndex={i}
                  onCardPlace={() => {
                    if (traitorTargetCard) {
                      // Attempt to move card to this flag
                      const newFlags = [...flags];
                      const fromIndex = (traitorTargetCard as any).fromFlagIndex;
                      const fromFlag = newFlags[fromIndex];
                      const toFlag = newFlags[i];

                      if (toFlag.formation.player.cards.length >= 3 || toFlag.winner || fromFlag.winner) return;

                      fromFlag.formation.opponent.cards = fromFlag.formation.opponent.cards.filter(c => c.id !== traitorTargetCard.id);
                      toFlag.formation.player.cards.push(traitorTargetCard);
                      setFlags(newFlags);

                      setTraitorActive(false);
                      setTraitorTargetCard(null);
                      setPlayerTacticsPlayed(n => n + 1);
                    } else if (selectedCard) {
                      playCard(i);
                    } else {
                      setSelectedFlag(prev => (prev === i ? null : i));
                    }
                  }}
                />
                </div>
              ))}
            </div>

            {/* Right: Tactics Deck */}
            <div id="tactic-deck" className="w-24 flex justify-center">
              <Deck cardsRemaining={tacticsDeck.length} variant="tactic" />
            </div>
          </div>

          {/* Tactical Config Modal */}
          {gameState === 'playing' && flyingCard === null && animatingPlay === null && (
            <div className="flex gap-4 justify-center mt-2">
              <button
                onClick={() => drawFromDeck('troop')}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded shadow"
              >
                Draw Troop
              </button>
              <button
                onClick={() => drawFromDeck('tactic')}
                disabled={!canPlayTactic()}
                className={`px-4 py-2 rounded shadow font-semibold ${
                  canPlayTactic()
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                    : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                }`}
              >
                Draw Tactic
              </button>
            </div>
          )}

          {scoutDrawStep && (
            <ScoutDrawModal
              drawn={scoutDrawStep.drawn}
              remaining={scoutDrawStep.remaining}
              keep={scoutDrawStep.keep}
              discards={scoutDrawStep.discards}
              onDrawFromTroop={() => handleScoutDraw('troop')}
              onDrawFromTactic={() => handleScoutDraw('tactic')}
              onPickFinal={handleScoutChoose}
              onDiscardSelect={handleScoutDiscardOrder}
              onCancel={() => setScoutDrawStep(null)}
            />
          )}

          <div id="hand" className="flex justify-center gap-2">
            {playerHand.map(card => (
              <Card
                key={card.id}
                id={`card-${card.id}`}
                card={card}
                selected={selectedCard?.id === card.id}
                onClick={() =>
                  setSelectedCard(prev => (prev?.id === card.id ? null : card))
                }
              />
            ))}
          </div>
        </div>
        <div className="w-40 flex flex-col items-center gap-4 pt-2">
          <button onClick={() => setShowRules(true)} className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 px-3 rounded shadow w-full">
            Rules
          </button>
          <button onClick={() => setShowGuide(true)} className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 px-3 rounded shadow w-full">
            Formations
          </button>
          <button onClick={() => setShowStats(true)} className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 px-3 rounded shadow w-full">
            Deck Stats
          </button>
        </div>
      </div>
    </div>
  );
}
