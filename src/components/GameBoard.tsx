import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameContext } from '../context/GameContext';
import type { Flag as FlagType } from '../types/game';
import { DraggableCard } from './DraggableCard';
import { CardBack } from './CardBack';
import { CardFly } from './CardFly';
import { Deck } from './Deck';
import { DeckStats } from './DeckStats';
import { DrawModal } from './DrawModal';
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
    handleCardDrop,
    handleSwapCards,
    handleSortHand,
    handleSave,
    toastMessage,
    flyingCard,
    flyFrom,
    flyTo,
    animatingAction,
    onFlyComplete,
    showRules,
    showGuide,
    showStats,
    rulesTab,
    setRulesTab,
    openRules,
    openGuide,
    openStats,
    closeRules,
    closeGuide,
    closeStats,
    onExit,
    multiplayerConfig,
    peerStatus,
  } = useGameContext();

  const isMultiplayer = !!multiplayerConfig;
  const isRealtimeMP  = multiplayerConfig?.transport === 'realtime';
  const playerName    = multiplayerConfig?.localPlayer.username ?? 'You';
  const opponentName  = multiplayerConfig?.opponentName ?? 'CPU Bot';

  // Track whether the victory modal has been dismissed so the board stays visible.
  const [victoryDismissed, setVictoryDismissed] = useState(false);
  useEffect(() => {
    if (gameState.gameStatus === 'playing') setVictoryDismissed(false);
  }, [gameState.gameStatus]);

  // Local "Saved!" toast
  const [saveToast, setSaveToast] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onSave = () => {
    handleSave();
    setSaveToast(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaveToast(false), 2000);
  };

  // Show the draw modal when the player must draw and no tactic resolution is pending.
  const showDrawModal =
    currentTurn === 'awaitingDraw' &&
    !gameState.scoutDrawStep &&
    !gameState.pendingTactics &&
    !gameState.pendingTraitor &&
    !gameState.leaderPending &&
    !gameState.companionPending &&
    !gameState.shieldPending &&
    gameState.gameStatus === 'playing';

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
          {!isMultiplayer && (
            <button
              onClick={onSave}
              disabled={currentTurn === 'opponent'}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save
            </button>
          )}
          {!isMultiplayer && (
            <button
              onClick={handleNewGame}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold transition"
            >
              New Game
            </button>
          )}
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
          <ProfileCard name={opponentName} isOpponent />
          <div id="opponent-hand" className="flex-1 flex justify-center gap-1.5 flex-wrap">
            {gameState.opponentHand.map(card => (
              <motion.div
                key={card.id}
                layout
                transition={{ layout: { duration: 0.25, ease: 'easeOut' } }}
                whileHover={{ y: -8, transition: { duration: 0.15 } }}
              >
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

        {/* Deck strip — both decks centered below flags (draw is handled by DrawModal) */}
        <div className="shrink-0 flex justify-center items-center gap-10">
          <div id="deck-troop" className="flex flex-col items-center gap-1">
            <Deck cardsRemaining={gameState.deck.length} variant="troop" />
            <span className="text-[10px] text-slate-600 uppercase tracking-widest">Troops</span>
          </div>
          <div className="w-px h-10 bg-slate-800" />
          <div id="deck-tactic" className="flex flex-col items-center gap-1">
            <Deck cardsRemaining={gameState.tacticsDeck.length} variant="tactic" />
            <span className="text-[10px] text-slate-600 uppercase tracking-widest">Tactics</span>
          </div>
        </div>

        {/* Player hand */}
        <div className="shrink-0 flex items-center gap-3">
          <ProfileCard name={playerName} />
          <div id="hand" className="flex-1 flex justify-center gap-1.5 flex-wrap">
            {gameState.playerHand.map(card => (
              <motion.div key={card.id} layout transition={{ layout: { duration: 0.25, ease: 'easeOut' } }}>
                <DraggableCard
                  card={card}
                  selected={gameState.selectedCard?.id === card.id}
                  onCardClick={() => handleCardClick(card)}
                  onDropOnFlag={handleCardDrop}
                  onDropOnCard={handleSwapCards}
                />
              </motion.div>
            ))}
          </div>
          {/* Auto-sort controls */}
          <div className="flex flex-col gap-1 shrink-0">
            <button
              onClick={() => handleSortHand('value')}
              title="Sort hand by card value"
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition"
            >
              ↑ Value
            </button>
            <button
              onClick={() => handleSortHand('color')}
              title="Sort hand by color, then value"
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition"
            >
              ⬛ Color
            </button>
          </div>
        </div>

      </div>

      {/* ── Flying card animation ─────────────────────────────────── */}
      {flyingCard && (
        <CardFly card={flyingCard} from={flyFrom} to={flyTo} onComplete={onFlyComplete} />
      )}

      {/* ── Error / info toast ───────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-red-800 border border-red-600 text-white text-sm px-5 py-2.5 rounded-full shadow-xl font-semibold whitespace-nowrap pointer-events-none">
          {toastMessage}
        </div>
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
      {showRules && (
        <RulesPopup
          onClose={closeRules}
          activeTab={rulesTab}
          onTabChange={setRulesTab}
        />
      )}
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
        !gameState.traitorActive &&
        !gameState.pendingTraitor && (
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
      {gameState.gameStatus !== 'playing' && !victoryDismissed && (
        <VictoryModal
          result={gameState.gameStatus}
          onPlayAgain={handleNewGame}
          onDismiss={() => setVictoryDismissed(true)}
        />
      )}

      {/* ── Post-game locked banner (shown after dismissing victory modal) ── */}
      {gameState.gameStatus !== 'playing' && victoryDismissed && (
        <div className={`
          fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-4 px-6 py-3
          border-t shadow-lg
          ${gameState.gameStatus === 'playerWon'
            ? 'bg-yellow-900/95 border-yellow-600 text-yellow-200'
            : 'bg-red-950/95 border-red-700 text-red-200'}
        `}>
          <span className="font-bold text-sm">
            {gameState.gameStatus === 'playerWon'
              ? '🏆 Victory — Your forces claimed the battle line!'
              : '💀 Defeated — The enemy broke through your defenses.'}
          </span>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleNewGame}
              className={`
                text-xs px-4 py-1.5 rounded-lg font-bold transition
                ${gameState.gameStatus === 'playerWon'
                  ? 'bg-yellow-400 hover:bg-yellow-300 text-black'
                  : 'bg-red-600 hover:bg-red-500 text-white'}
              `}
            >
              New Game
            </button>
            <button
              onClick={onExit}
              className="text-xs px-4 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600 transition"
            >
              Main Menu
            </button>
          </div>
        </div>
      )}

      {/* ── P2P: not yet connected (waiting / connecting / error) ── */}
      {isRealtimeMP && peerStatus !== 'connected' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl px-8 py-6 shadow-2xl text-center max-w-sm mx-4">
            {peerStatus === 'waiting' && (
              <>
                <p className="text-amber-400 font-bold text-sm mb-2">Waiting for opponent…</p>
                <p className="text-xs text-slate-400 mb-2">
                  Share this room code with{' '}
                  <span className="text-white font-semibold">{opponentName}</span>:
                </p>
                <p className="font-mono text-3xl text-amber-400 tracking-[0.3em] font-black mb-5 select-all">
                  {multiplayerConfig!.roomCode}
                </p>
              </>
            )}
            {peerStatus === 'connecting' && (
              <p className="text-slate-300 text-sm mb-5">Connecting to game…</p>
            )}
            {peerStatus === 'disconnected' && (
              <p className="text-red-400 text-sm mb-5">Opponent disconnected.</p>
            )}
            {peerStatus === 'error' && (
              <p className="text-red-400 text-sm mb-5">
                Connection error — room may be full or unavailable.
              </p>
            )}
            {peerStatus === 'idle' && (
              <p className="text-slate-400 text-sm mb-5">Initializing…</p>
            )}
            <button
              onClick={onExit}
              className="text-xs px-4 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600 transition"
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}

      {/* ── P2P: waiting for opponent's move (game in progress) ───── */}
      {isRealtimeMP && peerStatus === 'connected' && currentTurn === 'opponent' && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="bg-slate-900/90 border border-slate-700 rounded-xl px-5 py-2.5 text-center">
            <p className="text-sm text-slate-400">
              Waiting for{' '}
              <span className="text-amber-400 font-semibold">{opponentName}</span> to play…
            </p>
          </div>
        </div>
      )}

      {/* ── Forced draw modal ─────────────────────────────────────── */}
      {showDrawModal && (
        <DrawModal
          troopCount={gameState.deck.length}
          tacticCount={gameState.tacticsDeck.length}
          onDraw={handleDeckDraw}
        />
      )}

      {/* ── Save confirmation toast ───────────────────────────────── */}
      {saveToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-800 border border-green-600 text-white text-sm px-5 py-2.5 rounded-full shadow-xl font-semibold whitespace-nowrap pointer-events-none">
          Game saved!
        </div>
      )}
    </div>
  );
}
