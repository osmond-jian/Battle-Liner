import { useEffect, useRef, useState } from 'react';
import { getSlotCount } from '../utils/gameLogic';
import { motion } from 'framer-motion';
import { useGameContext } from '../context/GameContext';
import type { Flag as FlagType } from '../types/game';
import { Card } from './Card';
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
import { MAX_RETRIES } from '../hooks/usePeer';


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
    handleScoutSkipDraws,
    handleScoutDiscard,
    handleTacticsConfigConfirm,
    handleTacticsCancel,
    handleTraitorPlace,
    handleCardDrop,
    handleSwapCards,
    handleSortHand,
    handleSave,
    handleConcede,
    rematchPending,
    handleProposeRematch,
    handleAcceptRematch,
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
    guideTab,
    setGuideTab,
    closeStats,
    onExit,
    multiplayerConfig,
    peerStatus,
    hadGuest,
    peerRetryCount,
    peerLastError,
  } = useGameContext();

  const isMultiplayer = !!multiplayerConfig;
  const isRealtimeMP  = multiplayerConfig?.transport === 'realtime';
  const isHost        = !!multiplayerConfig?.isHost;
  const [showConnDetails, setShowConnDetails] = useState(false);
  const [showConcedeConfirm, setShowConcedeConfirm] = useState(false);
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

  // When any flag has mud (4 cards required), all flag columns must be the same
  // height so the flag poles stay visually aligned.
  const maxSlots = Math.max(...gameState.flags.map(f => getSlotCount(f)));

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
    <div className="h-[100dvh] bg-slate-950 text-white flex flex-col overflow-hidden">

      {/* ── Nav ────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-3 sm:px-5 py-2 sm:py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <span className="text-sm sm:text-base font-black tracking-widest text-amber-400 uppercase select-none">
          Battle Line
        </span>
        <div className="flex gap-1 sm:gap-2 items-center">
          {[
            { label: 'Rules',     action: openRules },
            { label: 'Reference', action: openGuide },
          ].map(({ label, action }) => (
            <button
              key={label}
              onClick={action}
              className="hidden sm:inline-flex text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              {label}
            </button>
          ))}
          {!isMultiplayer && (
            <button
              onClick={onSave}
              disabled={currentTurn === 'opponent'}
              className="hidden sm:inline-flex text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save
            </button>
          )}
          {!isMultiplayer && (
            <button
              onClick={handleNewGame}
              className="text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold transition"
            >
              New Game
            </button>
          )}
          {/* ── Concede (multiplayer only, active game only) ── */}
          {isRealtimeMP && gameState.gameStatus === 'playing' && (
            showConcedeConfirm ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-red-400 font-semibold hidden sm:inline">Concede?</span>
                <button
                  onClick={() => { handleConcede(); setShowConcedeConfirm(false); }}
                  className="text-xs px-2 py-1 rounded-lg bg-red-700 hover:bg-red-600 text-white font-bold transition"
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowConcedeConfirm(false)}
                  className="text-xs px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConcedeConfirm(true)}
                className="text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-red-900/60 text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-800 transition"
              >
                Concede
              </button>
            )
          )}
          <button
            onClick={onExit}
            className="text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 border border-slate-700 transition"
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
      <div className="flex-1 flex flex-col min-h-0 px-2 sm:px-4 py-2 gap-2">

        {/* P2P: waiting for opponent's move — shown above their cards */}
        {isRealtimeMP && peerStatus === 'connected' && currentTurn === 'opponent' && (
          <div className="shrink-0 flex justify-center">
            <div className="bg-slate-900/90 border border-slate-700 rounded-xl px-5 py-2 text-center pointer-events-none">
              <p className="text-sm text-slate-400">
                Waiting for{' '}
                <span className="text-amber-400 font-semibold">{opponentName}</span> to play…
              </p>
            </div>
          </div>
        )}

        {/* Opponent row */}
        <div className="shrink-0 flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <ProfileCard name={opponentName} isOpponent />
          </div>
          <div id="opponent-hand" className="flex-1 flex justify-center gap-1 sm:gap-1.5 flex-wrap">
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
                  className="!w-8 !h-11 sm:!w-11 sm:!h-16"
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Flags + Deck side panel — deck is always visible on the right edge */}
        <div className="flex-1 flex min-h-0 gap-1 sm:gap-2">

          {/* Flags — scrollable in both directions; centered when space allows */}
          <div className="flex-1 overflow-auto flags-scroll min-h-0">
            <div className="flex min-h-full items-center justify-center">
              <div className="flex gap-0.5 px-2 py-1">
                {/* ── Tactics graveyard column ── */}
                <div className="flex flex-col items-center gap-1 px-1 py-2 w-[88px] shrink-0 select-none border-r border-slate-800/50 mr-0.5">
                  {/* Opponent tactics — same row count as flag card areas */}
                  <div className="flex flex-col items-center gap-0.5 w-full">
                    {Array.from({ length: maxSlots }).map((_, i) => {
                      const c = gameState.opponentPlayedTactics[i];
                      return c
                        ? <Card key={c.id} card={c} condensed className="opacity-75" />
                        : <div key={i} className="w-full h-7 rounded border border-dashed border-white/[0.06]" />;
                    })}
                    {gameState.opponentPlayedTactics.slice(maxSlots).map(c => (
                      <Card key={c.id} card={c} condensed className="opacity-75" />
                    ))}
                  </div>

                  {/* Center badge — fixed height to match flag center (banner+pole+base ≈ 58px) */}
                  <div className="flex flex-col items-center justify-center my-0.5" style={{ height: '58px' }}>
                    <div className="w-px h-2.5 bg-slate-700/60" />
                    <div className="w-8 h-8 rounded-full bg-slate-800/80 border border-slate-600/60 flex items-center justify-center text-[15px] leading-none shadow-sm">
                      📜
                    </div>
                    <div className="w-px h-2.5 bg-slate-700/60" />
                    <span className="text-[7px] font-bold tracking-[0.15em] text-slate-600 uppercase mt-0.5">Used</span>
                  </div>

                  {/* Player tactics */}
                  <div className="flex flex-col items-center gap-0.5 w-full">
                    {Array.from({ length: maxSlots }).map((_, i) => {
                      const c = gameState.playerPlayedTactics[i];
                      return c
                        ? <Card key={c.id} card={c} condensed className="opacity-75" />
                        : <div key={i} className="w-full h-7 rounded border border-dashed border-white/[0.06]" />;
                    })}
                    {gameState.playerPlayedTactics.slice(maxSlots).map(c => (
                      <Card key={c.id} card={c} condensed className="opacity-75" />
                    ))}
                  </div>
                </div>

                {gameState.flags.map((flag: FlagType, i: number) => (
                  <Flag
                    key={flag.id}
                    flag={flag}
                    flagIndex={i}
                    displaySlots={maxSlots}
                    selected={gameState.selectedFlag === i}
                    onCardPlace={() => handleFlagClick(i)}
                    deserterActive={gameState.deserterActive}
                    traitorActive={gameState.traitorActive}
                    onDeserterSelect={handleOpponentCardClick}
                    onTraitorSelect={handleOpponentCardClick}
                    pendingTraitor={gameState.pendingTraitor}
                    onTraitorDestination={handleTraitorPlace}
                    lastOpponentHighlightCardId={
                      currentTurn !== 'opponent'
                        ? gameState.lastOpponentMove?.highlightCardId
                        : undefined
                    }
                    lastPlayerHighlightCardId={
                      currentTurn === 'opponent'
                        ? gameState.lastPlayerMove?.highlightCardId
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Deck side panel — fixed right edge, not part of flag scroll */}
          <div className="shrink-0 flex flex-col justify-center items-center gap-2 px-1 sm:px-2 border-l border-slate-800/60">
            {/* Mobile: compact mini-card representations */}
            <div className="sm:hidden flex flex-col items-center gap-3">
              <div id="deck-troop" className="flex flex-col items-center gap-0.5">
                <div className={`w-7 h-10 rounded border ${gameState.deck.length === 0 ? 'bg-slate-900 border-slate-800 opacity-40' : 'bg-blue-950 border-blue-800'}`} />
                <span className={`text-[11px] font-bold leading-none ${gameState.deck.length === 0 ? 'text-slate-600' : 'text-blue-300'}`}>
                  {gameState.deck.length}
                </span>
                <span className="text-[9px] text-slate-600 uppercase tracking-wider leading-none">Trp</span>
              </div>
              <div className="w-4 h-px bg-slate-800" />
              <div id="deck-tactic" className="flex flex-col items-center gap-0.5">
                <div className={`w-7 h-10 rounded border ${gameState.tacticsDeck.length === 0 ? 'bg-slate-900 border-slate-800 opacity-40' : 'bg-amber-950 border-amber-800'}`} />
                <span className={`text-[11px] font-bold leading-none ${gameState.tacticsDeck.length === 0 ? 'text-slate-600' : 'text-amber-300'}`}>
                  {gameState.tacticsDeck.length}
                </span>
                <span className="text-[9px] text-slate-600 uppercase tracking-wider leading-none">Tac</span>
              </div>
            </div>
            {/* Desktop: full Deck card visuals */}
            <div className="hidden sm:flex flex-col items-center gap-3">
              <div id="deck-troop">
                <Deck cardsRemaining={gameState.deck.length} variant="troop" />
              </div>
              <div className="w-8 h-px bg-slate-800" />
              <div id="deck-tactic">
                <Deck cardsRemaining={gameState.tacticsDeck.length} variant="tactic" />
              </div>
              <button
                onClick={openStats}
                className="text-[10px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-500 border border-slate-700 transition"
              >
                Stats
              </button>
            </div>
          </div>

        </div>

        {/* Player hand */}
        <div className="shrink-0 flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <ProfileCard name={playerName} />
          </div>
          {/* Mobile: horizontal scroll; desktop: wrapping centered row */}
          <div id="hand" className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto sm:overflow-x-visible sm:flex-wrap sm:justify-center pb-0.5 sm:pb-0">
            {gameState.playerHand.map(card => (
              <motion.div key={card.id} layout transition={{ layout: { duration: 0.25, ease: 'easeOut' } }}
                className="shrink-0">
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
          {/* Auto-sort controls — abbreviated labels on mobile */}
          <div className="flex flex-col gap-1 shrink-0">
            <button
              onClick={() => handleSortHand('value')}
              title="Sort hand by card value"
              className="text-xs px-1.5 sm:px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition"
            >
              <span className="hidden sm:inline">↑ Value</span>
              <span className="sm:hidden">↑V</span>
            </button>
            <button
              onClick={() => handleSortHand('color')}
              title="Sort hand by color, then value"
              className="text-xs px-1.5 sm:px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition"
            >
              <span className="hidden sm:inline">⬛ Color</span>
              <span className="sm:hidden">⬛C</span>
            </button>
          </div>
        </div>

        {/* Last move info — shown below the player hand */}
        {(gameState.lastOpponentMove || gameState.lastPlayerMove) && (
          <div className="shrink-0 flex flex-wrap gap-x-4 gap-y-0.5 px-1 text-[11px] leading-tight">
            {gameState.lastOpponentMove && currentTurn !== 'opponent' && (
              <span className="min-w-0 truncate text-red-400/80">
                <span className="font-semibold text-red-500">{opponentName}: </span>
                {gameState.lastOpponentMove.summary}
              </span>
            )}
            {gameState.lastPlayerMove && (
              <span className="min-w-0 truncate text-emerald-400/80 ml-auto">
                <span className="font-semibold text-emerald-500">You: </span>
                {gameState.lastPlayerMove.summary}
              </span>
            )}
          </div>
        )}

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
      {showGuide && (
        <FormationGuide
          onClose={closeGuide}
          activeTab={guideTab}
          onTabChange={setGuideTab}
        />
      )}
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
          playerHand={gameState.playerHand}
          troopDeckEmpty={gameState.deck.length === 0}
          tacticDeckEmpty={gameState.tacticsDeck.length === 0}
          onDrawFromTroop={() => handleScoutDraw('troop')}
          onDrawFromTactic={() => handleScoutDraw('tactic')}
          onSkipDraws={handleScoutSkipDraws}
          onDiscardConfirm={handleScoutDiscard}
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
          isMultiplayer={isRealtimeMP}
          rematchPending={rematchPending}
          onProposeRematch={handleProposeRematch}
          onAcceptRematch={handleAcceptRematch}
        />
      )}

      {/* ── Post-game locked banner (shown after dismissing victory modal) ── */}
      {gameState.gameStatus !== 'playing' && victoryDismissed && (
        <div className={`
          fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-4 px-6 py-3
          border-t shadow-lg
          ${gameState.gameStatus === 'playerWon'
            ? 'bg-yellow-900/95 border-yellow-600 text-yellow-200'
            : gameState.gameStatus === 'draw'
            ? 'bg-slate-800/95 border-slate-600 text-slate-200'
            : 'bg-red-950/95 border-red-700 text-red-200'}
        `}>
          <span className="font-bold text-sm">
            {gameState.gameStatus === 'playerWon'
              ? '🏆 Victory — Your forces claimed the battle line!'
              : gameState.gameStatus === 'draw'
              ? '🤝 Draw — The battle line holds. Neither side broke through.'
              : '💀 Defeated — The enemy broke through your defenses.'}
          </span>
          <div className="flex gap-2 shrink-0">
            {!isRealtimeMP && (
              <button
                onClick={handleNewGame}
                className={`
                  text-xs px-4 py-1.5 rounded-lg font-bold transition
                  ${gameState.gameStatus === 'playerWon'
                    ? 'bg-yellow-400 hover:bg-yellow-300 text-black'
                    : gameState.gameStatus === 'draw'
                    ? 'bg-slate-500 hover:bg-slate-400 text-white'
                    : 'bg-red-600 hover:bg-red-500 text-white'}
                `}
              >
                New Game
              </button>
            )}
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
          <div className="bg-slate-900 border border-slate-700 rounded-2xl px-8 py-6 shadow-2xl text-center max-w-sm mx-4 space-y-4">

            {peerStatus === 'waiting' && (
              <div>
                {isHost ? (
                  <>
                    <p className="text-amber-400 font-bold text-sm mb-2">
                      {hadGuest ? 'Opponent disconnected — waiting to reconnect…' : 'Waiting for opponent…'}
                    </p>
                    <p className="text-xs text-slate-400 mb-2">
                      {hadGuest
                        ? 'Ask them to re-enter the room code:'
                        : <>Share this room code with{' '}<span className="text-white font-semibold">{opponentName}</span>:</>}
                    </p>
                    <p className="font-mono text-3xl text-amber-400 tracking-[0.3em] font-black select-all">
                      {multiplayerConfig!.roomCode}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-amber-400 font-bold text-sm mb-2">
                      Host disconnected — waiting to reconnect…
                    </p>
                    <p className="text-xs text-slate-400">
                      The host's connection was interrupted. They should reconnect automatically.
                    </p>
                  </>
                )}
              </div>
            )}

            {peerStatus === 'idle' && (
              <p className="text-slate-400 text-sm">Initializing…</p>
            )}

            {peerStatus === 'connecting' && (
              <div>
                <p className="text-slate-300 text-sm font-semibold">Connecting to game…</p>
                <p className="text-xs text-slate-500 mt-1">
                  Server may be starting up — first connect can take ~1 minute.
                </p>
              </div>
            )}

            {peerStatus === 'reconnecting' && (
              <div>
                <p className="text-amber-400 text-sm font-semibold">Connection lost — reconnecting…</p>
                <p className="text-xs text-slate-400 mt-1">
                  Attempt {peerRetryCount + 1} of {MAX_RETRIES} · retrying every 3s
                </p>
              </div>
            )}

            {peerStatus === 'disconnected' && (
              <div>
                <p className="text-red-400 text-sm font-semibold">
                  {isHost ? 'Opponent could not reconnect.' : `Could not reconnect after ${MAX_RETRIES} attempts.`}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {isHost
                    ? 'The guest may have closed the game.'
                    : 'The server may be down or the room expired. Ask the host to start a new game.'}
                </p>
              </div>
            )}

            {peerStatus === 'error' && (
              <div>
                <p className="text-red-400 text-sm font-semibold">Could not reach server</p>
                <p className="text-xs text-slate-400 mt-1">
                  Retrying automatically — check your internet connection.
                </p>
              </div>
            )}

            {/* Details toggle — shown for states that have diagnostic info */}
            {(peerStatus === 'connecting' || peerStatus === 'reconnecting' || peerStatus === 'disconnected' || peerStatus === 'error') && peerLastError && (
              <div className="text-left">
                <button
                  onClick={() => setShowConnDetails(v => !v)}
                  className="text-xs text-slate-500 hover:text-slate-300 transition"
                >
                  {showConnDetails ? '▲ Hide details' : '▼ Show details'}
                </button>
                {showConnDetails && (
                  <div className="mt-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-400 font-mono break-all">
                    {peerLastError}
                  </div>
                )}
              </div>
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
