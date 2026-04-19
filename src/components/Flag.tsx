import React from 'react';
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
  /** Board-wide max slots (4 when any flag has mud). Used to keep all flag
   *  columns the same height so the flag poles line up vertically. */
  displaySlots?: number;
  /** Card ID of the opponent's last-placed card — rendered with a red highlight ring. */
  lastOpponentHighlightCardId?: string;
  /** Card ID of the player's last-placed card — rendered with a green highlight ring. */
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
  // Total rows to render per side — at least `slots`, but padded to `displaySlots`
  // so all flag columns have the same height and flag poles stay aligned.
  const totalRows = Math.max(slots, displaySlots ?? 0);

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
      `}
    >
      {/* ── Opponent cards (top, rendered bottom-to-top so first card is at top) */}
      <div
        id={`flag-${flagIndex}-opponent`}
        className="flex flex-col items-center gap-0.5 w-full"
      >
        {Array.from({ length: totalRows }).map((_, i) => {
          // Extra rows beyond this flag's slot count are invisible height-spacers.
          if (i >= slots) {
            return <div key={i} className="w-full h-7 invisible" />;
          }
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

      {/* ── Flag pole & banner */}
      <div className="flex flex-col items-center my-0.5">
        {/* Banner */}
        <div className={`
          w-10 rounded-t-sm py-0.5 flex items-center justify-center
          text-[11px] font-bold shadow-sm
          ${wonByPlayer   ? 'bg-emerald-500 text-white' :
            wonByOpponent ? 'bg-red-600 text-white'      :
                            'bg-slate-600 text-slate-200'}
        `}>
          {wonByPlayer ? '✔' : wonByOpponent ? '✘' : flagIndex + 1}
        </div>
        {/* Pole */}
        <div
          className={`w-1.5 rounded-full ${wonByPlayer ? 'bg-emerald-400' : wonByOpponent ? 'bg-red-500' : 'bg-slate-500'}`}
          style={{ height: '32px' }}
        />
        {/* Base */}
        <div className={`w-6 h-1.5 rounded-full ${wonByPlayer ? 'bg-emerald-600' : wonByOpponent ? 'bg-red-700' : 'bg-slate-600'}`} />
      </div>

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

      {/* ── Player cards (bottom) */}
      <div
        id={`flag-${flagIndex}-player`}
        className="flex flex-col items-center gap-0.5 w-full"
      >
        {Array.from({ length: totalRows }).map((_, i) => {
          // Extra rows beyond this flag's slot count are invisible height-spacers.
          if (i >= slots) {
            return <div key={i} className="w-full h-7 invisible" />;
          }
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
