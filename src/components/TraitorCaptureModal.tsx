import { Card as CardType, Flag as FlagType } from '../types/game';
import { Card } from './Card';

interface TraitorCaptureModalProps {
  flags: FlagType[];
  onCapture: (card: CardType, flagIndex: number) => void;
}

export function TraitorCaptureModal({ flags, onCapture }: TraitorCaptureModalProps) {
  // Only troop cards from non-won flags can be captured
  const targets = flags.flatMap((flag, flagIndex) => {
    if (flag.winner) return [];
    return flag.formation.opponent.cards
      .filter(card => card.type === 'troop')
      .map(card => ({ card, flagIndex }));
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-2xl max-w-2xl w-full text-white">
        <h2 className="text-lg font-bold text-amber-400 mb-1">Traitor</h2>
        <p className="text-sm text-slate-400 mb-4">Select an opponent troop card to steal for your side.</p>

        {targets.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No opponent troop cards available to capture.</p>
        ) : (
          <div className="flex flex-wrap gap-3 justify-center">
            {targets.map(({ card, flagIndex }) => (
              <div key={card.id} className="flex flex-col items-center gap-1">
                <div
                  onClick={() => onCapture(card, flagIndex)}
                  className="cursor-pointer hover:scale-105 transition-transform ring-2 ring-transparent hover:ring-amber-400 rounded-xl"
                >
                  <Card card={card} />
                </div>
                <span className="text-[10px] text-slate-500">Flag {flagIndex + 1}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
