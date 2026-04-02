import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card as CardType, Flag as FlagType } from '../types/game';
import { Card } from './Card';

interface DeserterModalProps {
  flags: FlagType[];
  onConfirm: (card: CardType, flagIndex: number) => void;
  onCancel: () => void;
}

export function DeserterModal({ flags, onConfirm, onCancel }: DeserterModalProps) {
  const [minimized, setMinimized] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Flags that have at least one opponent card to remove
  const activeFlags = flags
    .map((flag, i) => ({ flag, i }))
    .filter(({ flag }) => !flag.winner && flag.formation.opponent.cards.length > 0);

  if (minimized) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-800 text-white font-bold text-sm shadow-xl hover:bg-red-700 transition border border-red-600"
        >
          <span>✕</span>
          <span>Deserter — select a card to remove · tap to resume</span>
        </button>
      </div>
    );
  }

  return (
    <div ref={backdropRef} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <motion.div
        drag
        dragConstraints={backdropRef}
        dragMomentum={false}
        dragElastic={0}
        className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl text-white"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 cursor-grab active:cursor-grabbing">
          <div className="w-8 h-1 rounded-full bg-slate-600" />
        </div>

        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-red-400">✕ Deserter</h2>
              <p className="text-sm text-slate-400 mt-0.5">Click an opponent card to remove it from play.</p>
            </div>
            <button
              onClick={() => setMinimized(true)}
              className="ml-3 px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs border border-slate-600 transition shrink-0"
            >
              View Board
            </button>
          </div>

          {activeFlags.length === 0 ? (
            <p className="text-sm text-slate-500 italic py-4 text-center">No opponent cards available to remove.</p>
          ) : (
            <div className="overflow-x-auto pb-1">
              <div className="flex gap-1 min-w-max">
                {activeFlags.map(({ flag, i: flagIndex }) => {
                  const slots = flag.modifiers.includes('mud') ? 4 : 3;
                  const wonByPlayer = flag.winner === 'player';
                  const wonByOpp   = flag.winner === 'opponent';

                  return (
                    <div
                      key={flag.id}
                      className="flex flex-col items-center gap-0.5 px-1 py-2 rounded-xl w-[84px] shrink-0 bg-slate-900/40 ring-1 ring-red-800/40"
                    >
                      {/* Opponent cards — clickable */}
                      <div className="flex flex-col items-center gap-0.5 w-full">
                        {Array.from({ length: slots }).map((_, si) => {
                          const card = flag.formation.opponent.cards[si];
                          return card ? (
                            <div
                              key={card.id}
                              onClick={() => onConfirm(card, flagIndex)}
                              className="w-full cursor-pointer"
                            >
                              <Card
                                card={card}
                                condensed
                                className="ring-1 ring-red-500/60 hover:ring-red-400 hover:brightness-110 transition-all"
                              />
                            </div>
                          ) : (
                            <div key={si} className="w-full h-7 rounded border border-dashed border-white/5" />
                          );
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

                      {/* Player cards (bottom, non-interactive) */}
                      <div className="flex flex-col items-center gap-0.5 w-full">
                        {Array.from({ length: slots }).map((_, si) => {
                          const card = flag.formation.player.cards[si];
                          return card
                            ? <Card key={card.id} card={card} condensed className="opacity-50" />
                            : <div key={si} className="w-full h-7 rounded border border-dashed border-white/5" />;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end border-t border-slate-700 pt-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
