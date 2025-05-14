import { 
  Card as CardType,
  Flag as FlagType,
  GameState
} from '../types/game';
import { Card } from './Card';
import { CardBack } from './CardBack';
import { CardFly } from './CardFly';
import { Deck } from './Deck';
import { DeckStats } from './DeckStats';
import { Flag } from './Flag';
import { FormationGuide } from './FormationGuide';
import { RedeployModal } from './RedeployModal';
import { RulesPopup } from './RulesPopup';
import { ScoutDrawModal } from './ScoutDrawModal';
import { TacticsConfigModal } from './TacticalConfigModal';
import { ProfileCard } from './profileCard';

interface GameBoardProps {
  gameState: GameState;
  showRules: boolean;
  showGuide: boolean;
  showStats: boolean;
  onCardClick: (card: CardType) => void;
  onOpponentCardClick: (card: CardType, flagIndex: number) => void;
  onFlagClick: (flagIndex: number) => void;
  onDeckDraw: (deckType: 'troop' | 'tactic') => void;
  onResetGame: () => void;
  onShowRules: () => void;
  onShowGuide: () => void;
  onShowStats: () => void;
  onCloseRules: () => void;
  onCloseGuide: () => void;
  onCloseStats: () => void;
  onScoutDraw: (deckType: 'troop' | 'tactic') => void;
  onScoutChoose: (card: CardType) => void;
  onScoutDiscard: (card: CardType) => void;
  onRedeployConfirm: (sourceFlagIndex: number, cardIndex: number, destinationFlagIndex: number | null) => void;
  onTacticsConfigConfirm: (color: string, value: number) => void;
  onTacticsCancel: () => void;
  onTraitorPlace: (toFlagIndex: number) => void;
  flyingCard: CardType | null;
  flyFrom: { x: number; y: number };
  flyTo: { x: number; y: number };
  onFlyComplete: () => void;
  turnMessage:string;
}

export function GameBoard({
  gameState,
  showRules,
  showGuide,
  showStats,
  turnMessage,
  onCardClick,
  onOpponentCardClick,
  onFlagClick,
  onDeckDraw,
  onResetGame,
  onShowRules,
  onShowGuide,
  onShowStats,
  onCloseRules,
  onCloseGuide,
  onCloseStats,
  onScoutDraw,
  onScoutChoose,
  onScoutDiscard,
  onRedeployConfirm,
  onTacticsConfigConfirm,
  onTacticsCancel,
  onTraitorPlace,
  flyingCard,
  flyFrom,
  flyTo,
  onFlyComplete
}: GameBoardProps) {
    return (
    <div className="min-h-screen bg-gray-900 text-white p-4 space-y-6">
      {/* Navigation */}
      <nav className="flex justify-between items-center p-4 rounded-lg bg-gray-800 border border-gray-700">
        <h1 className="text-2xl font-bold">Battle Line</h1>
        <div className="flex gap-2">
          <button onClick={onShowRules} className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded shadow transition">Rules</button>
          <button onClick={onShowGuide} className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded shadow transition">Formation Strength</button>
          <button onClick={onResetGame} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition">New Game</button>
        </div>
      </nav>
      
      {/* Main content - padded container */}
      <div className="px-4 sm:px-8 md:px-12 space-y-6">

      {/* Turn Phase Indicator */}
      <div className="text-center w-full py-2">
        <div className="text-lg font-medium text-yellow-300 bg-gray-800 border border-gray-700 rounded p-2 inline-block shadow">
          {turnMessage}
        </div>
      </div>

      {/* Opponent Section */}
      <div className="flex items-center gap-4 px-4">
        <ProfileCard name="CPU Bot" isOpponent />
        <div className="flex justify-center w-full">
          <div id="opponent-hand" className="flex gap-2">
            {gameState.opponentHand.map((card: CardType) => <CardBack key={card.id} variant="troop" />)}
          </div>
        </div>
        
        {/* Tactical Config Menu */}
        <div className="flex flex-col justify-start gap-2 pt-1">
          <button onClick={onShowRules} className="bg-blue-400 hover:bg-yellow-500 text-black px-4 py-2 rounded shadow transition">Rules</button>
          <button onClick={onShowGuide} className="bg-blue-400 hover:bg-yellow-500 text-black px-4 py-2 rounded shadow transition">Formations</button>
          <button onClick={onShowStats} className="bg-blue-400 hover:bg-yellow-500 text-black px-4 py-2 rounded shadow transition">Deck Stats</button>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex items-start justify-between w-full px-4">
        {/* Troop Deck */}
        <div className="flex flex-col items-center gap-1 mt-8">
          <Deck cardsRemaining={gameState.deck.length} />
          <button onClick={() => onDeckDraw('troop')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition">Draw Troop</button>
        </div>

        {/* Flags (with card slots) */}
        <div className="grid grid-cols-9 gap-2 w-full justify-items-center">
          {gameState.flags.map((flag: FlagType, i: number) => (
            <Flag
              key={flag.id}
              flag={flag}
              flagIndex={i}
              selected={gameState.selectedFlag === i}
              onCardPlace={() => onFlagClick(i)}
              deserterActive={gameState.deserterActive}
              traitorActive={gameState.traitorActive}
              onDeserterSelect={onOpponentCardClick}
              onTraitorSelect={onOpponentCardClick}
              pendingTraitor={gameState.pendingTraitor}
              onTraitorDestination={onTraitorPlace}
            />
          ))}
        </div>

        {/* Tactics Deck */}
        <div className="flex flex-col items-center gap-1 mt-8">
          <Deck cardsRemaining={gameState.tacticsDeck.length} variant="tactic" />
          <button onClick={() => onDeckDraw('tactic')} className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded shadow transition">Draw Tactic</button>
        </div>
      </div>

      {/* Player Section */}
      <div className="flex items-center gap-4 px-4 mt-6">
        <ProfileCard name="You" />
        <div id="hand" className="flex justify-center flex-wrap gap-2 w-full">
          {gameState.playerHand.map(card => (
            <Card
              key={card.id}
              id={`card-${card.id}`}
              card={card}
              onClick={() => onCardClick(card)}
              selected={gameState.selectedCard?.id === card.id}
            />
          ))}
        </div>
      </div>

      {/* Flying card animation */}
      {flyingCard && <CardFly card={flyingCard} from={flyFrom} to={flyTo} onComplete={onFlyComplete} />}

      {/* Modals */}
      {showRules && <RulesPopup onClose={onCloseRules} />}
      {showGuide && <FormationGuide onClose={onCloseGuide} />}
      {showStats && <DeckStats onClose={onCloseStats} deck={gameState.deck} playerHand={gameState.playerHand} opponentHand={gameState.opponentHand} flags={gameState.flags} />}
      {gameState.redeployState && <RedeployModal flags={gameState.flags} onCancel={() => onTraitorPlace(-1)} onConfirm={onRedeployConfirm} />}
      {gameState.pendingTactics?.card?.name && gameState.pendingTactics.flagIndex != null && (
        <TacticsConfigModal
          cardName={gameState.pendingTactics.card.name}
          onConfirm={onTacticsConfigConfirm}
          onCancel={onTacticsCancel}
        />
      )}
      {gameState.scoutDrawStep && (
        <ScoutDrawModal
          drawn={gameState.scoutDrawStep.drawn}
          remaining={gameState.scoutDrawStep.remaining}
          keep={gameState.scoutDrawStep.keep}
          discards={gameState.scoutDrawStep.discards}
          onDrawFromTroop={() => onScoutDraw('troop')}
          onDrawFromTactic={() => onScoutDraw('tactic')}
          onPickFinal={onScoutChoose}
          onDiscardSelect={onScoutDiscard}
          onCancel={onTacticsCancel}
        />
      )}

      {/* Tactic Prompts */}
      {gameState.deserterActive && <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow">Deserter Active: Click an opponent card to remove</div>}
      {gameState.traitorActive && <div className="fixed top-4 right-4 bg-yellow-500 text-black px-4 py-2 rounded shadow">Traitor Active: Click an opponent troop to convert</div>}
      {gameState.pendingTraitor && <div className="text-center text-yellow-300 font-medium mt-4">Select a flag to place the captured card: {gameState.pendingTraitor.card.name}</div>}
    </div>
  </div>

  
  );
}