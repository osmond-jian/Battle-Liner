import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag as FlagType } from '../types/game';
import { Card } from './Card';
import type { Card as CardType } from '../types/game';
import { getSlotCount } from '../utils/gameLogic';

interface FlagProps {
  flag: FlagType;
  onCardPlace?: () => void;
  selected?: boolean;
  onDeserterSelect?: (card: CardType, flagIndex: number) => void;
  deserterActive?: boolean;
  flagIndex: number;
  traitorActive?: boolean;
  onTraitorSelect?: (card: CardType, fromFlagIndex: number) => void;
  pendingTraitor?: { card: CardType; fromFlag: number } | null;
  onTraitorDestination?: (toFlagIndex: number) => void;
  displaySlots?: number;
  lastOpponentHighlightCardId?: string;
  lastPlayerHighlightCardId?: string;
}

export function Flag({
  flag,
  onCardPlace,
  selected,
  deserterActive = false,
  onDeserterSelect,
  flagIndex,
  traitorActive = false,
  onTraitorSelect,
  pendingTraitor,
  onTraitorDestination,
  displaySlots,
  lastOpponentHighlightCardId,
  lastPlayerHighlightCardId,
}: FlagProps) {
  const isTraitorTarget =
    !!pendingTraitor &&
    flagIndex !== pendingTraitor.fromFlag &&
    flag.formation.player.cards.length < 3 &&
    !flag.winner;

  const handleClick = () => {
    if (isTraitorTarget && onTraitorDestination) {
      onTraitorDestination(flagIndex);
    } else {
      onCardPlace?.();
    }
  };

  const wonByPlayer   = flag.winner === 'player';
  const wonByOpponent = flag.winner === 'opponent';
  const slots = getSlotCount(flag);
  const totalRows = Math.max(slots, displaySlots ?? 0);

  // ── Capture animation ──────────────────────────────────────────────────────
  const prevWinnerRef = useRef(flag.winner);
  const [justCaptured, setJustCaptured] = useState<'player' | 'opponent' | null>(null);

  useEffect(() => {
    if (flag.winner && !prevWinnerRef.current) {
      setJustCaptured(flag.winner);
      const t = setTimeout(() => setJustCaptured(null), 900);
      return () => clearTimeout(t);
    }
    prevWinnerRef.current = flag.winner;
  }, [flag.winner]);

  const captureGlow =
    justCaptured === 'player'
      ? 'shadow-[0_0_20px_6px_rgba(52,211,153,0.6)]'
      : justCaptured === 'opponent'
      ? 'shadow-[0_0_20px_6px_rgba(239,68,68,0.6)]'
      : '';

  return (
    <div
      id={`flag-${flagIndex}`}
      data-flag-index={flagIndex}
      onClick={handleClick}
      className={`
        flex flex-col items-center gap-1 px-1 py-2 rounded-xl cursor-pointer select-none w-[88px]
        transition-all duration-150
        ${selected        ? 'ring-2 ring-blue-400 bg-blue-900/30 shadow-lg shadow-blue-500/20' : ''}
        ${isTraitorTarget ? 'ring-2 ring-yellow-400 bg-yellow-400/10 shadow-lg shadow-yellow-400/20' : ''}
        ${!selected && !isTraitorTarget ? 'hover:bg-white/5' : ''}
        ${captureGlow}
      `}
    >
      {/* ── Opponent cards */}
      <div id={`flag-${flagIndex}-opponent`} className="flex flex-col items-center gap-0.5 w-full">
        {Array.from({ length: totalRows }).map((_, i) => {
          if (i >= slots) return <div key={i} className="w-full h-7 invisible" />;
          const card = flag.formation.opponent.cards[i];
          return card ? (
            <Card
              key={card.id}
              card={card}
              condensed
              onClick={() => {
                if (deserterActive && onDeserterSelect) onDeserterSelect(card, flagIndex);
                else if (traitorActive && onTraitorSelect && card.type === 'troop') onTraitorSelect(card, flagIndex);
              }}
              className={
                card.id === lastOpponentHighlightCardId
                  ? 'ring-2 ring-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'
                  : (deserterActive || traitorActive) && card.type === 'troop'
                  ? 'cursor-pointer ring-1 ring-red-400 brightness-110'
                  : ''
              }
            />
          ) : (
            <div key={i} className="w-full h-7 rounded border border-dashed border-white/10" />
          );
        })}
      </div>

      {/* ── Flag pole & banner ─────────────────────────────────────────────── */}
      <div className="flex flex-col items-center my-0.5">
        {/* Banner */}
        <motion.div
          animate={
            justCaptured
              ? { scale: [1, 1.35, 1.1, 1], filter: ['brightness(1)', 'brightness(2.2)', 'brightness(1.3)', 'brightness(1)'] }
              : { scale: 1, filter: 'brightness(1)' }
          }
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className={`
            w-10 rounded-t-sm py-0.5 flex items-center justify-center
            text-[11px] font-bold shadow-sm
            ${wonByPlayer   ? 'bg-emerald-500 text-white' :
              wonByOpponent ? 'bg-red-600 text-white'      :
                              'bg-slate-600 text-slate-200'}
          `}
        >
          {wonByPlayer ? '✔' : wonByOpponent ? '✘' : flagIndex + 1}
        </motion.div>

        {/* Pole */}
        <motion.div
          animate={justCaptured ? { scaleY: [1, 1.05, 1] } : { scaleY: 1 }}
          transition={{ duration: 0.4 }}
          className={`w-1.5 rounded-full ${wonByPlayer ? 'bg-emerald-400' : wonByOpponent ? 'bg-red-500' : 'bg-slate-500'}`}
          style={{ height: '32px', transformOrigin: 'top' }}
        />

        {/* Base */}
        <div className={`w-6 h-1.5 rounded-full ${wonByPlayer ? 'bg-emerald-600' : wonByOpponent ? 'bg-red-700' : 'bg-slate-600'}`} />
      </div>

      {/* Capture badge */}
      <AnimatePresence>
        {justCaptured && (
          <motion.div
            key="capture-badge"
            initial={{ opacity: 0, y: 4, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className={`
              absolute text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-full shadow-lg pointer-events-none
              ${justCaptured === 'player' ? 'bg-emerald-500 text-white' : 'bg-red-600 text-white'}
            `}
            style={{ marginTop: '-4px' }}
          >
            Captured!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modifier tags */}
      {(flag.modifiers.includes('fog') || flag.modifiers.includes('mud')) && (
        <div className="flex flex-wrap justify-center gap-0.5 mb-0.5">
          {flag.modifiers.includes('fog') && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-slate-700 text-slate-300 border border-slate-600 leading-none">
              🌫 Fog
            </span>
          )}
          {flag.modifiers.includes('mud') && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-yellow-900/60 text-yellow-400 border border-yellow-700/40 leading-none">
              💧 Mud
            </span>
          )}
        </div>
      )}

      {/* ── Player cards */}
      <div id={`flag-${flagIndex}-player`} className="flex flex-col items-center gap-0.5 w-full">
        {Array.from({ length: totalRows }).map((_, i) => {
          if (i >= slots) return <div key={i} className="w-full h-7 invisible" />;
          const card = flag.formation.player.cards[i];
          return card ? (
            <Card
              key={card.id}
              card={card}
              condensed
              className={
                card.id === lastPlayerHighlightCardId
                  ? 'ring-2 ring-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                  : ''
              }
            />
          ) : (
            <div key={i} className="w-full h-7 rounded border border-dashed border-white/10" />
          );
        })}
      </div>
    </div>
  );
}
