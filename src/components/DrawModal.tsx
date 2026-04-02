interface DrawModalProps {
  troopCount: number;
  tacticCount: number;
  onDraw: (deckType: 'troop' | 'tactic') => void;
}

/**
 * Non-dismissible modal that forces the player to draw a card at end of turn.
 * Replaces the manual deck buttons so the draw phase cannot be skipped.
 */
export function DrawModal({ troopCount, tacticCount, onDraw }: DrawModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
        <h2 className="text-xl font-black text-amber-400 uppercase tracking-widest mb-2">
          Draw a Card
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          Choose a deck to draw from to end your turn.
        </p>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => onDraw('troop')}
            disabled={troopCount === 0}
            className={`
              flex flex-col items-center gap-1.5 px-7 py-5 rounded-xl border-2 font-bold transition
              ${troopCount > 0
                ? 'bg-blue-900 hover:bg-blue-800 border-blue-500 text-blue-200 cursor-pointer'
                : 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed opacity-50'}
            `}
          >
            <span className="text-3xl select-none">🃏</span>
            <span className="text-sm uppercase tracking-wide">Troop</span>
            <span className="text-xs font-normal text-slate-400">{troopCount} remaining</span>
          </button>

          <button
            onClick={() => onDraw('tactic')}
            disabled={tacticCount === 0}
            className={`
              flex flex-col items-center gap-1.5 px-7 py-5 rounded-xl border-2 font-bold transition
              ${tacticCount > 0
                ? 'bg-amber-900 hover:bg-amber-800 border-amber-500 text-amber-200 cursor-pointer'
                : 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed opacity-50'}
            `}
          >
            <span className="text-3xl select-none">✦</span>
            <span className="text-sm uppercase tracking-wide">Tactic</span>
            <span className="text-xs font-normal text-slate-400">{tacticCount} remaining</span>
          </button>
        </div>
      </div>
    </div>
  );
}
