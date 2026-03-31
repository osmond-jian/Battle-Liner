import { Flag } from '../types/game';

interface TraitorPlaceModalProps {
  flags: Flag[];
  fromFlagIndex: number;
  onPlace: (toFlagIndex: number) => void;
}

export function TraitorPlaceModal({ flags, fromFlagIndex, onPlace }: TraitorPlaceModalProps) {
  const validFlags = flags
    .map((f, i) => ({ flag: f, index: i }))
    .filter(({ flag, index }) => {
      if (flag.winner) return false;
      if (index === fromFlagIndex) return false;
      const slots = flag.modifiers.includes('mud') ? 4 : 3;
      return flag.formation.player.cards.length < slots;
    });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-2xl text-white max-w-md w-full">
        <h2 className="text-lg font-bold text-amber-400 mb-1">Place the captured card</h2>
        <p className="text-sm text-slate-400 mb-4">Choose a flag to add the card to your formation.</p>

        {validFlags.length === 0 ? (
          <p className="text-sm text-slate-400 italic">
            No valid flags available — all flags are either won or full.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {validFlags.map(({ flag, index: i }) => {
              const slots = flag.modifiers.includes('mud') ? 4 : 3;
              const used = flag.formation.player.cards.length;
              return (
                <button
                  key={i}
                  onClick={() => onPlace(i)}
                  className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-sm font-semibold border border-amber-500 transition"
                >
                  Flag {i + 1}
                  <span className="ml-1.5 text-xs text-amber-300">({used}/{slots})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
