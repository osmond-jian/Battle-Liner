import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Flag, Card as CardType } from '../types/game';
import { Card } from './Card';

interface RedeployModalProps {
  flags: Flag[];
  onCancel: () => void;
  onConfirm: (sourceFlagIndex: number, cardIndex: number, destinationFlagIndex: number | null) => void;
}

interface Selection {
  flagIndex: number;
  cardIndex: number;
}

const COLOR_BG: Record<string, string> = {
  red:    'bg-red-600',
  blue:   'bg-blue-700',
  green:  'bg-emerald-700',
  orange: 'bg-orange-500',
  purple: 'bg-purple-700',
  yellow: 'bg-yellow-500',
};

function CardChip({ card, onClick, highlight }: { card: CardType; onClick?: () => void; highlight?: 'selected' | 'none' }) {
  const bg = card.type === 'tactic'
    ? 'bg-amber-700 border-amber-500'
    : `${COLOR_BG[card.color!] ?? 'bg-slate-600'} border-white/20`;
  const label = card.type === 'tactic' ? (card.name ?? '?') : `${card.value}`;

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`
        w-full h-7 rounded border text-xs font-bold text-white truncate px-1.5 transition-all
        ${bg}
        ${highlight === 'selected'
          ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-800 scale-105'
          : onClick ? 'hover:brightness-125 hover:scale-105 cursor-pointer' : 'cursor-default opacity-70'}
      `}
    >
      {label}
    </button>
  );
}

function EmptySlot({ onClick, isTarget }: { onClick?: () => void; isTarget?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`
        w-full h-7 rounded border text-[10px] font-semibold transition-all
        ${isTarget
          ? 'border-blue-400 bg-blue-900/40 text-blue-300 hover:bg-blue-700/40 cursor-pointer animate-pulse'
          : 'border-dashed border-slate-700 text-slate-700 cursor-default'}
      `}
    >
      {isTarget ? '+' : ''}
    </button>
  );
}

export function RedeployModal({ flags, onConfirm }: RedeployModalProps) {
  const [minimized, setMinimized] = useState(false);
  const [selection, setSelection]  = useState<Selection | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const handleSelectCard = (flagIndex: number, cardIndex: number) => {
    if (selection?.flagIndex === flagIndex && selection?.cardIndex === cardIndex) {
      setSelection(null);
    } else {
      setSelection({ flagIndex, cardIndex });
    }
  };

  const handlePlaceAt = (destFlagIndex: number) => {
    if (!selection) return;
    onConfirm(selection.flagIndex, selection.cardIndex, destFlagIndex);
  };

  const handleReturnToDeck = () => {
    if (!selection) return;
    onConfirm(selection.flagIndex, selection.cardIndex, null);
  };

  const isValidDestination = (flagIndex: number): boolean => {
    if (!selection) return false;
    const flag = flags[flagIndex];
    if (flag.winner) return false;
    if (flagIndex === selection.flagIndex) return false;
    const slots = flag.modifiers.includes('mud') ? 4 : 3;
    return flag.formation.player.cards.length < slots;
  };

  if (minimized) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-600 text-white font-bold text-sm shadow-xl hover:bg-slate-500 transition border border-slate-500"
        >
          <span>↩</span>
          <span>Redeploy{selection ? ' — choose destination' : ' — select a card'} · tap to resume</span>
        </button>
      </div>
    );
  }

  return (
    <div ref={backdropRef} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <motion.div
        drag
        dragConstraints={backdropRef}
        dragMomentum={false}
        dragElastic={0}
        className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl text-white cursor-default"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-0 cursor-grab active:cursor-grabbing">
          <div className="w-8 h-1 rounded-full bg-slate-600" />
        </div>

        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold">↩ Redeploy</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                {!selection
                  ? 'Step 1 — Click one of your cards to move it'
                  : 'Step 2 — Click a destination slot, or return the card to its deck'}
              </p>
            </div>
            <button
              onClick={() => setMinimized(true)}
              className="ml-3 px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs border border-slate-600 transition shrink-0"
            >
              View Board
            </button>
          </div>

          {/* Flag board */}
          <div className="overflow-x-auto pb-1">
            <div className="flex gap-1 min-w-max">
              {flags.map((flag, flagIndex) => {
                const slots = flag.modifiers.includes('mud') ? 4 : 3;
                const isSource     = selection?.flagIndex === flagIndex;
                const hasValidSlot = isValidDestination(flagIndex);
                const isWon        = !!flag.winner;
                const wonByPlayer  = flag.winner === 'player';
                const wonByOpp     = flag.winner === 'opponent';

                return (
                  <div
                    key={flag.id}
                    className={`
                      flex flex-col items-center gap-0.5 px-1 py-2 rounded-xl w-[84px] shrink-0 transition-all
                      ${isSource     ? 'bg-amber-900/30 ring-1 ring-amber-500' : ''}
                      ${hasValidSlot ? 'bg-blue-900/20 ring-1 ring-blue-500/50' : ''}
                      ${isWon && !isSource && !hasValidSlot ? 'opacity-40' : ''}
                      ${!isSource && !hasValidSlot && !isWon ? 'bg-slate-900/30' : ''}
                    `}
                  >
                    {/* Opponent cards (top, non-interactive) */}
                    <div className="flex flex-col items-center gap-0.5 w-full">
                      {Array.from({ length: slots }).map((_, i) => {
                        const card = flag.formation.opponent.cards[i];
                        return card
                          ? <Card key={card.id} card={card} condensed className="opacity-60" />
                          : <div key={i} className="w-full h-7 rounded border border-dashed border-white/5" />;
                      })}
                    </div>

                    {/* Flag pole & banner */}
                    <div className="flex flex-col items-center my-1">
                      <div className={`
                        w-10 rounded-t-sm py-0.5 flex items-center justify-center text-[11px] font-bold
                        ${wonByPlayer ? 'bg-emerald-500 text-white' : wonByOpp ? 'bg-red-600 text-white' : 'bg-slate-600 text-slate-200'}
                      `}>
                        {wonByPlayer ? '✔' : wonByOpp ? '✘' : flagIndex + 1}
                      </div>
                      <div className={`w-1.5 rounded-full ${wonByPlayer ? 'bg-emerald-400' : wonByOpp ? 'bg-red-500' : 'bg-slate-500'}`} style={{ height: '24px' }} />
                      <div className={`w-6 h-1.5 rounded-full ${wonByPlayer ? 'bg-emerald-600' : wonByOpp ? 'bg-red-700' : 'bg-slate-600'}`} />
                    </div>

                    {/* Player cards (bottom, selectable) */}
                    <div className="flex flex-col items-center gap-0.5 w-full">
                      {Array.from({ length: slots }).map((_, slotIndex) => {
                        const card = flag.formation.player.cards[slotIndex];
                        const isSelectedCard = isSource && selection?.cardIndex === slotIndex;
                        const isSelectableSource = !selection && !isWon && card !== undefined;
                        const canPlaceHere = selection !== null && isValidDestination(flagIndex);

                        if (card) {
                          return (
                            <CardChip
                              key={slotIndex}
                              card={card}
                              highlight={isSelectedCard ? 'selected' : 'none'}
                              onClick={isSelectableSource ? () => handleSelectCard(flagIndex, slotIndex) : undefined}
                            />
                          );
                        }
                        return (
                          <EmptySlot
                            key={slotIndex}
                            isTarget={canPlaceHere}
                            onClick={canPlaceHere ? () => handlePlaceAt(flagIndex) : undefined}
                          />
                        );
                      })}
                    </div>

                    {/* Modifiers */}
                    {(flag.modifiers.includes('fog') || flag.modifiers.includes('mud')) && (
                      <div className="flex gap-0.5 mt-0.5">
                        {flag.modifiers.includes('fog') && <span className="text-[9px]">🌫</span>}
                        {flag.modifiers.includes('mud') && <span className="text-[9px]">💧</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer actions */}
          {selection && (
            <div className="flex gap-2 pt-1 border-t border-slate-700">
              <button
                onClick={() => setSelection(null)}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm text-slate-300 transition"
              >
                ← Deselect
              </button>
              <button
                onClick={handleReturnToDeck}
                className="px-4 py-2 rounded-xl bg-red-900/60 hover:bg-red-800/60 border border-red-700 text-sm text-red-300 font-semibold transition"
              >
                Return to Deck
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
