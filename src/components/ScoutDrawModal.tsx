import { useState } from 'react';
import { Card as CardType } from '../types/game';
import { Card } from './Card';

interface ScoutDrawModalProps {
  drawn: CardType[];
  remaining: number;
  keep?: CardType;
  discards?: CardType[];
  onDrawFromTroop: () => void;
  onDrawFromTactic: () => void;
  onPickFinal: (selected: CardType) => void;
  onDiscardSelect: (selected: CardType) => void;
  onCancel: () => void;
}

export function ScoutDrawModal({
  drawn,
  remaining,
  keep,
  discards,
  onDrawFromTroop,
  onDrawFromTactic,
  onPickFinal,
  onDiscardSelect,
}: ScoutDrawModalProps) {
  const [minimized, setMinimized] = useState(false);

  const step =
    remaining > 0 ? 'draw'
    : !keep       ? 'pick'
                  : 'order';

  const stepLabel =
    step === 'draw'  ? `Draw ${remaining} more card${remaining !== 1 ? 's' : ''}`
    : step === 'pick'  ? 'Keep one card'
                       : 'Set return order';

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
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 text-white max-w-lg w-full space-y-4">

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
          {(['draw', 'pick', 'order'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              {i > 0 && <div className="w-4 h-px bg-slate-600" />}
              <span className={`px-2 py-0.5 rounded-full font-semibold ${step === s ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-500'}`}>
                {i + 1}
              </span>
              <span className={step === s ? 'text-slate-200' : 'text-slate-600'}>
                {s === 'draw' ? 'Draw 3' : s === 'pick' ? 'Keep 1' : 'Order 2'}
              </span>
            </div>
          ))}
        </div>

        {/* Step: draw */}
        {step === 'draw' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Draw {remaining} more card{remaining !== 1 ? 's' : ''} from either deck. Already drawn: {drawn.length}
            </p>
            {drawn.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {drawn.map(c => <Card key={c.id} card={c} />)}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={onDrawFromTroop}
                className="flex-1 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 border border-blue-500 font-semibold text-sm transition"
              >
                Draw Troop
              </button>
              <button
                onClick={onDrawFromTactic}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 border border-amber-400 font-semibold text-sm transition"
              >
                Draw Tactic
              </button>
            </div>
          </div>
        )}

        {/* Step: pick */}
        {step === 'pick' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">Click a card to add it to your hand. The other two return to their decks.</p>
            <div className="flex gap-3 justify-center flex-wrap">
              {drawn.map(c => (
                <div
                  key={c.id}
                  onClick={() => onPickFinal(c)}
                  className="cursor-pointer hover:scale-105 transition-transform ring-2 ring-transparent hover:ring-blue-400 rounded-xl"
                >
                  <Card card={c} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step: order */}
        {step === 'order' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Click the card you want placed <strong className="text-slate-200">on top</strong> of its deck first.
              The other goes second.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              {discards?.map(c => (
                <div
                  key={c.id}
                  onClick={() => onDiscardSelect(c)}
                  className="cursor-pointer hover:scale-105 transition-transform ring-2 ring-transparent hover:ring-amber-400 rounded-xl"
                >
                  <Card card={c} />
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
