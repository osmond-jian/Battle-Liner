import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Card as CardType } from '../types/game';
import { Card } from './Card';

interface ScoutDrawModalProps {
  drawn: CardType[];
  remaining: number;
  playerHand: CardType[];
  troopDeckEmpty: boolean;
  tacticDeckEmpty: boolean;
  onDrawFromTroop: () => void;
  onDrawFromTactic: () => void;
  onSkipDraws: () => void;
  onDiscardConfirm: (cards: [CardType, CardType]) => void;
  onCancel: () => void;
}

export function ScoutDrawModal({
  drawn,
  remaining,
  playerHand,
  troopDeckEmpty,
  tacticDeckEmpty,
  onDrawFromTroop,
  onDrawFromTactic,
  onSkipDraws,
  onDiscardConfirm,
}: ScoutDrawModalProps) {
  const [minimized, setMinimized] = useState(false);
  const [selectedDiscards, setSelectedDiscards] = useState<CardType[]>([]);
  const backdropRef = useRef<HTMLDivElement>(null);

  const step: 'draw' | 'discard' = remaining > 0 ? 'draw' : 'discard';

  const bothDecksEmpty = troopDeckEmpty && tacticDeckEmpty;

  const stepLabel =
    step === 'draw'
      ? bothDecksEmpty
        ? 'Both decks empty — skip remaining draws'
        : `Draw ${remaining} more card${remaining !== 1 ? 's' : ''}`
      : `Pick 2 cards to return (${selectedDiscards.length}/2 selected)`;

  const toggleDiscard = (card: CardType) => {
    setSelectedDiscards(prev => {
      const already = prev.some(c => c.id === card.id);
      if (already) return prev.filter(c => c.id !== card.id);
      if (prev.length >= 2) return prev; // already have 2
      return [...prev, card];
    });
  };

  const handleConfirm = () => {
    if (selectedDiscards.length === 2) {
      onDiscardConfirm([selectedDiscards[0], selectedDiscards[1]]);
    }
  };

  if (minimized) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 text-white font-bold text-sm shadow-xl hover:bg-blue-500 transition"
        >
          <span>👁</span>
          <span>Scout: {stepLabel} — tap to resume</span>
        </button>
      </div>
    );
  }

  return (
    <div ref={backdropRef} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <motion.div
        drag
        dragConstraints={backdropRef}
        dragMomentum={false}
        dragElastic={0}
        className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl text-white max-w-lg w-full"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 cursor-grab active:cursor-grabbing">
          <div className="w-8 h-1 rounded-full bg-slate-600" />
        </div>
        <div className="p-6 space-y-4">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-blue-400">Scout</h2>
              <p className="text-sm text-slate-400">{stepLabel}</p>
            </div>
            <button
              onClick={() => setMinimized(true)}
              className="ml-3 px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs border border-slate-600 transition shrink-0"
            >
              View Board
            </button>
          </div>

          {/* Step indicators */}
          <div className="flex gap-2 text-xs">
            {(['draw', 'discard'] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                {i > 0 && <div className="w-4 h-px bg-slate-600" />}
                <span className={`px-2 py-0.5 rounded-full font-semibold ${step === s ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-500'}`}>
                  {i + 1}
                </span>
                <span className={step === s ? 'text-slate-200' : 'text-slate-600'}>
                  {s === 'draw' ? 'Draw up to 3' : 'Return 2'}
                </span>
              </div>
            ))}
          </div>

          {/* Step: draw */}
          {step === 'draw' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Draw up to 3 cards from either deck. Drawn cards go into your hand.{' '}
                Already drawn: <span className="text-blue-300 font-semibold">{drawn.length}</span>
              </p>
              {drawn.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {drawn.map(c => <Card key={c.id} card={c} />)}
                </div>
              )}
              {bothDecksEmpty ? (
                <button
                  onClick={onSkipDraws}
                  className="w-full py-2.5 rounded-xl bg-slate-600 hover:bg-slate-500 border border-slate-500 font-semibold text-sm transition"
                >
                  Skip remaining draws
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={onDrawFromTroop}
                    disabled={troopDeckEmpty}
                    className="flex-1 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 border border-blue-500 font-semibold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Draw Troop
                  </button>
                  <button
                    onClick={onDrawFromTactic}
                    disabled={tacticDeckEmpty}
                    className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 border border-amber-400 font-semibold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Draw Tactic
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step: discard — pick any 2 from full hand */}
          {step === 'discard' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Select <strong className="text-slate-200">any 2 cards</strong> from your hand to return to their decks.
                You may return cards you didn't draw this turn.
              </p>
              <div className="flex gap-2 flex-wrap justify-center max-h-52 overflow-y-auto py-1">
                {playerHand.map(c => {
                  const isSelected = selectedDiscards.some(d => d.id === c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleDiscard(c)}
                      className={`cursor-pointer transition-transform hover:scale-105 rounded-xl
                        ${isSelected ? 'ring-2 ring-red-400 scale-105' : 'ring-2 ring-transparent opacity-80 hover:opacity-100'}`}
                    >
                      <Card card={c} />
                    </div>
                  );
                })}
              </div>
              <button
                onClick={handleConfirm}
                disabled={selectedDiscards.length !== 2}
                className="w-full py-2.5 rounded-xl bg-red-700 hover:bg-red-600 border border-red-500 font-semibold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Return selected cards ({selectedDiscards.length}/2)
              </button>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
}
