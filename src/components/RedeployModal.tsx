import { useState } from 'react';
import { Flag, Card as CardType } from '../types/game';

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
        w-full h-8 rounded-lg border text-xs font-bold text-white truncate px-1.5 transition-all
        ${bg}
        ${highlight === 'selected'
          ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-800 scale-105'
          : onClick ? 'hover:brightness-125 hover:scale-105 cursor-pointer' : 'cursor-default opacity-80'}
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
        w-full h-8 rounded-lg border text-[10px] font-semibold transition-all
        ${isTarget
          ? 'border-blue-400 bg-blue-900/40 text-blue-300 hover:bg-blue-700/40 cursor-pointer animate-pulse'
          : 'border-dashed border-slate-600 text-slate-700 cursor-default'}
      `}
    >
      {isTarget ? 'Place here' : ''}
    </button>
  );
}

export function RedeployModal({ flags, onConfirm }: RedeployModalProps) {
  const [minimized, setMinimized]   = useState(false);
  const [selection, setSelection]   = useState<Selection | null>(null);

  const handleSelectCard = (flagIndex: number, cardIndex: number) => {
    if (selection?.flagIndex === flagIndex && selection?.cardIndex === cardIndex) {
      setSelection(null); // deselect
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

  // Determine which flags are valid destinations for the selected card
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
          <span>Redeploy{selection ? ` — card selected, choose destination` : ' — select a card'} · tap to resume</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-5 w-full max-w-4xl text-white space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">↩ Redeploy</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {!selection
                ? 'Step 1 — Click one of your cards to move it'
                : 'Step 2 — Click an empty slot to place it, or return it to its deck'}
            </p>
          </div>
          <button
            onClick={() => setMinimized(true)}
            className="ml-3 px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs border border-slate-600 transition shrink-0"
          >
            View Board
          </button>
        </div>

        {/* Flag columns */}
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-2 min-w-max">
            {flags.map((flag, flagIndex) => {
              const slots = flag.modifiers.includes('mud') ? 4 : 3;
              const isSource = selection?.flagIndex === flagIndex;
              const hasValidSlot = isValidDestination(flagIndex);
              const isWon = !!flag.winner;

              return (
                <div
                  key={flag.id}
                  className={`
                    flex flex-col items-center gap-1 p-2 rounded-xl w-[74px] shrink-0 transition-all
                    ${isSource  ? 'bg-amber-900/30 ring-1 ring-amber-500' : ''}
                    ${hasValidSlot ? 'bg-blue-900/20 ring-1 ring-blue-500/50' : ''}
                    ${isWon && !isSource && !hasValidSlot ? 'opacity-40' : ''}
                    ${!isSource && !hasValidSlot && !isWon ? 'bg-slate-900/40' : ''}
                  `}
                >
                  {/* Flag label */}
                  <div className={`
                    text-[11px] font-bold rounded px-1.5 py-0.5 w-full text-center
                    ${flag.winner === 'player'   ? 'bg-emerald-700 text-white' :
                      flag.winner === 'opponent' ? 'bg-red-800 text-white'     :
                                                   'bg-slate-700 text-slate-300'}
                  `}>
                    {flag.winner === 'player' ? '✔' : flag.winner === 'opponent' ? '✘' : ''} F{flagIndex + 1}
                  </div>

                  {/* Slots */}
                  {Array.from({ length: slots }).map((_, slotIndex) => {
                    const card = flag.formation.player.cards[slotIndex];
                    const isSelectedCard = isSource && selection?.cardIndex === slotIndex;
                    // Can this card be selected as source?
                    const isSelectableSource =
                      !selection &&
                      !isWon &&
                      card !== undefined;

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

                    // Empty slot — is it a valid destination?
                    const canPlaceHere = selection !== null && isValidDestination(flagIndex);
                    return (
                      <EmptySlot
                        key={slotIndex}
                        isTarget={canPlaceHere}
                        onClick={canPlaceHere ? () => handlePlaceAt(flagIndex) : undefined}
                      />
                    );
                  })}

                  {/* Modifiers */}
                  {(flag.modifiers.includes('fog') || flag.modifiers.includes('mud')) && (
                    <div className="flex gap-0.5">
                      {flag.modifiers.includes('fog') && <span className="text-[9px]">🌫</span>}
                      {flag.modifiers.includes('mud') && <span className="text-[9px]">💧</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Return to deck / deselect */}
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
    </div>
  );
}
