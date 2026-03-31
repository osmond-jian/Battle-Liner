import { Card as CardType, Flag as FlagType } from '../types/game';
import { Card } from './Card';

interface DeserterModalProps {
  flags: FlagType[];
  onConfirm: (card: CardType, flagIndex: number) => void;
  onCancel: () => void;
}

export function DeserterModal({ flags, onConfirm, onCancel }: DeserterModalProps) {
  // Build a flat list of (card, flagIndex) — exclude won flags
  const targets = flags.flatMap((flag, flagIndex) => {
    if (flag.winner) return [];
    return flag.formation.opponent.cards.map(card => ({ card, flagIndex }));
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-2xl max-w-2xl w-full text-white">
        <h2 className="text-lg font-bold text-red-400 mb-1">Deserter</h2>
        <p className="text-sm text-slate-400 mb-4">Select an opponent card to remove from play.</p>

        {targets.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No valid opponent cards to remove.</p>
        ) : (
          <div className="flex flex-wrap gap-3 justify-center">
            {targets.map(({ card, flagIndex }) => (
              <div key={card.id} className="flex flex-col items-center gap-1">
                <div
                  onClick={() => onConfirm(card, flagIndex)}
                  className="cursor-pointer hover:scale-105 transition-transform ring-2 ring-transparent hover:ring-red-400 rounded-xl"
                >
                  <Card card={card} />
                </div>
                <span className="text-[10px] text-slate-500">Flag {flagIndex + 1}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
