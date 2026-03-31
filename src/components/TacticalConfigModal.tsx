import { useState } from 'react';
import { CardColor, CardValue } from '../types/game';
import { CARD_COLORS } from '../constants';

interface Props {
  cardName: string;
  onConfirm: (color: CardColor, value: CardValue) => void;
  onCancel: () => void;
}

const SHIELD_VALUES: CardValue[] = [1, 2, 3];
const ALL_VALUES: CardValue[]    = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const COLOR_STYLES: Record<CardColor, { bg: string; ring: string; label: string }> = {
  red:    { bg: 'bg-red-600',     ring: 'ring-red-400',     label: 'Red'    },
  blue:   { bg: 'bg-blue-700',    ring: 'ring-blue-400',    label: 'Blue'   },
  green:  { bg: 'bg-emerald-700', ring: 'ring-emerald-400', label: 'Green'  },
  orange: { bg: 'bg-orange-500',  ring: 'ring-orange-400',  label: 'Orange' },
  purple: { bg: 'bg-purple-700',  ring: 'ring-purple-400',  label: 'Purple' },
  yellow: { bg: 'bg-yellow-500',  ring: 'ring-yellow-400',  label: 'Yellow' },
};

export function TacticsConfigModal({ cardName, onConfirm }: Props) {
  const [minimized, setMinimized]     = useState(false);
  const [selectedColor, setSelectedColor] = useState<CardColor | null>(null);
  const [selectedValue, setSelectedValue] = useState<CardValue | null>(null);

  const isCompanion = cardName === 'Companion Cavalry';
  const isShield    = cardName === 'Shield Bearers';
  const isLeader    = cardName === 'Leader';

  const valueOptions = isShield ? SHIELD_VALUES : ALL_VALUES;
  const needsValue   = isLeader || isShield;

  const canConfirm = selectedColor !== null && (isCompanion || selectedValue !== null);

  const handleConfirm = () => {
    if (!canConfirm || selectedColor === null) return;
    const value: CardValue = isCompanion ? 8 : selectedValue!;
    onConfirm(selectedColor, value);
  };

  // ── Minimized: floating pill ──────────────────────────────────────────────
  if (minimized) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500 text-black font-bold text-sm shadow-xl hover:bg-amber-400 transition"
        >
          <span>✦</span>
          <span>Configure {cardName} — tap to resume</span>
        </button>
      </div>
    );
  }

  // ── Full modal ────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm text-white space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-amber-400">{cardName}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isCompanion
                ? 'Choose a color — value is fixed at 8.'
                : 'Choose a color and value for this wild card.'}
            </p>
          </div>
          <button
            onClick={() => setMinimized(true)}
            title="View board"
            className="ml-3 px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs border border-slate-600 transition shrink-0"
          >
            View Board
          </button>
        </div>

        {/* Color picker */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Color</p>
          <div className="grid grid-cols-3 gap-2">
            {CARD_COLORS.map(color => {
              const s = COLOR_STYLES[color];
              const active = selectedColor === color;
              return (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`
                    relative h-10 rounded-xl font-bold text-sm text-white transition-all
                    ${s.bg}
                    ${active
                      ? `ring-2 ${s.ring} ring-offset-2 ring-offset-slate-800 scale-105 shadow-lg`
                      : 'opacity-60 hover:opacity-100 hover:scale-105'}
                  `}
                >
                  {s.label}
                  {active && <span className="absolute top-0.5 right-1 text-[10px]">✔</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Value picker */}
        {needsValue && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
              Value{isShield ? ' (1–3)' : ''}
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {valueOptions.map(v => {
                const active = selectedValue === v;
                return (
                  <button
                    key={v}
                    onClick={() => setSelectedValue(v)}
                    className={`
                      h-10 rounded-xl font-black text-base transition-all
                      ${active
                        ? `ring-2 ring-offset-2 ring-offset-slate-800 scale-110 shadow-md
                           ${selectedColor ? COLOR_STYLES[selectedColor].ring : 'ring-white'}
                           ${selectedColor ? COLOR_STYLES[selectedColor].bg : 'bg-slate-600'} text-white`
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-200 hover:scale-105'}
                    `}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isCompanion && (
          <div className="flex items-center gap-2 bg-slate-700/50 rounded-xl px-3 py-2">
            <span className="text-amber-400 text-lg font-black">8</span>
            <span className="text-xs text-slate-400">Value is always 8 for Companion Cavalry.</span>
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className={`
            w-full py-2.5 rounded-xl text-sm font-bold transition
            ${canConfirm
              ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-sm'
              : 'bg-slate-700 text-slate-600 cursor-not-allowed'}
          `}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
