import { motion } from 'framer-motion';
import { useGameContext } from '../context/GameContext';
import type { Flag as FlagType } from '../types/game';
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
import { DeserterModal } from './DeserterModal';
import { TraitorCaptureModal } from './TraitorCaptureModal';
import { TraitorPlaceModal } from './TraitorPlaceModal';
import { VictoryModal } from './VictoryModal';

export function GameBoard() {
  const {
    gameState,
    currentTurn,
    turnMessage,
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
    flyingCard,
    flyFrom,
    flyTo,
    animatingAction,
    onFlyComplete,
    showRules,
    showGuide,
    showStats,
    openRules,
    openGuide,
    openStats,
    closeRules,
    closeGuide,
    closeStats,
    onExit,
  } = useGameContext();

  const canDrawTroop  = currentTurn === 'awaitingDraw' && gameState.deck.length > 0;
  const canDrawTactic = currentTurn === 'awaitingDraw' && gameState.tacticsDeck.length > 0;

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden">

      {/* ── Nav ────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-5 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <span className="text-base font-black tracking-widest text-amber-400 uppercase select-none">
          Battle Line
        </span>
        <div className="flex gap-2">
          {[
            { label: 'Rules',     action: openRules },
            { label: 'Reference', action: openGuide },
          ].map(({ label, action }) => (
            <button
              key={label}
              onClick={action}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              {label}
            </button>
          ))}
          <button
            onClick={handleNewGame}
            className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold transition"
          >
            New Game
          </button>
          <button
            onClick={onExit}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 border border-slate-700 transition"
          >
            Menu
          </button>
        </div>
      </nav>

      {/* ── Turn banner ────────────────────────────────────────────── */}
      <div className={`
        text-center py-1 text-xs font-semibold tracking-widest uppercase shrink-0
        ${currentTurn === 'player'       ? 'bg-blue-950 text-blue-300 border-b border-blue-900'   :
          currentTurn === 'awaitingDraw' ? 'bg-amber-950 text-amber-300 border-b border-amber-900' :
                                           'bg-slate-900 text-slate-500 border-b border-slate-800'}
      `}>
        {turnMessage}
      </div>

      {/* ── Main play area ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 px-4 py-2 gap-2">

        {/* Opponent row */}
        <div className="shrink-0 flex items-center gap-3">
          <ProfileCard name="CPU Bot" isOpponent />
          <div id="opponent-hand" className="flex-1 flex justify-center gap-1.5 flex-wrap">
            {gameState.opponentHand.map(card => (
              <motion.div key={card.id} layout transition={{ layout: { duration: 0.25, ease: 'easeOut' } }}>
                <CardBack
                  id={`opponent-card-${card.id}`}
                  variant="troop"
                  className="!w-11 !h-16"
                />
              </motion.div>
            ))}
          </div>
          {/* Mirror width of ProfileCard so hand stays perfectly centered */}
          <button
            onClick={openStats}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition shrink-0"
          >
            Deck Stats
          </button>
        </div>

        {/* Flags — centered, scrollable */}
        <div className="flex-1 flex items-center justify-center overflow-x-auto flags-scroll min-h-0">
          <div className="flex gap-0.5 px-2">
            {gameState.flags.map((flag: FlagType, i: number) => (
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
                onTraitorDestination={handleTraitorPlace}
              />
            ))}
          </div>
        </div>

        {/* Deck strip — both decks centered below flags */}
        <div className="shrink-0 flex justify-center items-start gap-10">

          {/* Troop deck */}
          <div id="deck-troop" className="flex flex-col items-center gap-1.5">
            <Deck cardsRemaining={gameState.deck.length} variant="troop" />
            <button
              onClick={() => handleDeckDraw('troop')}
              disabled={!canDrawTroop}
              className={`
                text-xs px-4 py-1.5 rounded-lg font-semibold border transition w-full
                ${canDrawTroop
                  ? 'bg-blue-700 hover:bg-blue-600 border-blue-500 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed'}
              `}
            >
              Draw Troop
            </button>
          </div>

          {/* Divider */}
          <div className="flex flex-col items-center justify-center gap-1 pt-8 text-slate-700 select-none">
            <div className="w-px h-8 bg-slate-800" />
            <span className="text-[10px] uppercase tracking-widest text-slate-600">or</span>
            <div className="w-px h-8 bg-slate-800" />
          </div>

          {/* Tactics deck */}
          <div id="deck-tactic" className="flex flex-col items-center gap-1.5">
            <Deck cardsRemaining={gameState.tacticsDeck.length} variant="tactic" />
            <button
              onClick={() => handleDeckDraw('tactic')}
              disabled={!canDrawTactic}
              className={`
                text-xs px-4 py-1.5 rounded-lg font-semibold border transition w-full
                ${canDrawTactic
                  ? 'bg-amber-600 hover:bg-amber-500 border-amber-400 text-white shadow-sm shadow-amber-500/20'
                  : 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed'}
              `}
            >
              Draw Tactic
            </button>
          </div>
        </div>

        {/* Player hand */}
        <div className="shrink-0 flex items-center gap-3">
          <ProfileCard name="You" />
          <div id="hand" className="flex-1 flex justify-center gap-1.5 flex-wrap">
            {gameState.playerHand.map(card => (
              <motion.div key={card.id} layout transition={{ layout: { duration: 0.25, ease: 'easeOut' } }}>
                <Card
                  id={`player-card-${card.id}`}
                  card={card}
                  onClick={() => handleCardClick(card)}
                  selected={gameState.selectedCard?.id === card.id}
                />
              </motion.div>
            ))}
          </div>
          {/* Spacer mirrors the Deck Stats button width so hand stays centered */}
          <div className="text-xs px-2.5 py-1.5 opacity-0 pointer-events-none select-none shrink-0">
            Deck Stats
          </div>
        </div>

      </div>

      {/* ── Flying card animation ─────────────────────────────────── */}
      {flyingCard && (
        <CardFly card={flyingCard} from={flyFrom} to={flyTo} onComplete={onFlyComplete} />
      )}

      {/* ── Tactic status toasts ──────────────────────────────────── */}
      {gameState.deserterActive && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-red-700 text-white text-sm px-4 py-2 rounded-full shadow-lg font-semibold whitespace-nowrap">
          Deserter — click an opponent card to remove it
        </div>
      )}
      {gameState.traitorActive && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-amber-600 text-black text-sm px-4 py-2 rounded-full shadow-lg font-semibold whitespace-nowrap">
          Traitor — click an opponent troop to convert it
        </div>
      )}
      {gameState.pendingTraitor && !gameState.traitorActive && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-yellow-500 text-black text-sm px-4 py-2 rounded-full shadow-lg font-semibold whitespace-nowrap">
          Place {gameState.pendingTraitor.card.name} — click a flag
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────── */}
      {showRules && <RulesPopup onClose={closeRules} />}
      {showGuide && <FormationGuide onClose={closeGuide} />}
      {showStats && (
        <DeckStats
          onClose={closeStats}
          deck={gameState.deck}
          playerHand={gameState.playerHand}
          opponentHand={gameState.opponentHand}
          flags={gameState.flags}
        />
      )}
      {gameState.redeployState && (
        <RedeployModal
          flags={gameState.flags}
          onCancel={handleTacticsCancel}
          onConfirm={handleRedeployConfirm}
        />
      )}
      {gameState.pendingTactics?.card?.name &&
        gameState.pendingTactics.flagIndex != null &&
        !gameState.redeployState &&
        !gameState.deserterActive &&
        !gameState.traitorActive && (
        <TacticsConfigModal
          cardName={gameState.pendingTactics.card.name}
          onConfirm={handleTacticsConfigConfirm}
          onCancel={handleTacticsCancel}
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
          onCancel={handleTacticsCancel}
        />
      )}
      {gameState.deserterActive && (
        <DeserterModal
          flags={gameState.flags}
          onConfirm={handleOpponentCardClick}
          onCancel={handleTacticsCancel}
        />
      )}
      {gameState.traitorActive && (
        <TraitorCaptureModal
          flags={gameState.flags}
          onCapture={handleOpponentCardClick}
        />
      )}
      {gameState.pendingTraitor && (
        <TraitorPlaceModal
          flags={gameState.flags}
          fromFlagIndex={gameState.pendingTraitor.fromFlag}
          onPlace={handleTraitorPlace}
        />
      )}
      {gameState.leaderPending && (
        <TacticsConfigModal
          cardName="Leader"
          onConfirm={handleTacticsConfigConfirm}
          onCancel={handleTacticsCancel}
        />
      )}
      {gameState.companionPending && (
        <TacticsConfigModal
          cardName="Companion Cavalry"
          onConfirm={handleTacticsConfigConfirm}
          onCancel={handleTacticsCancel}
        />
      )}
      {gameState.shieldPending && (
        <TacticsConfigModal
          cardName="Shield Bearers"
          onConfirm={handleTacticsConfigConfirm}
          onCancel={handleTacticsCancel}
        />
      )}
      {gameState.gameStatus !== 'playing' && (
        <VictoryModal
          result={gameState.gameStatus}
          onPlayAgain={handleNewGame}
        />
      )}
    </div>
  );
}
