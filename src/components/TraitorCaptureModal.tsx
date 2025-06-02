import { Card as CardType, Flag as FlagType } from '../types/game';
import { Card } from './Card';

interface TraitorCaptureModalProps {
  flags: FlagType[];
  onCapture: (card: CardType, flagIndex: number) => void;
}

export function TraitorCaptureModal({ flags, onCapture }: TraitorCaptureModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-600 shadow-lg max-w-3xl w-full">
        <h2 className="text-xl font-bold text-yellow-400 mb-4">Select an opponent's card to capture</h2>
        <div className="grid grid-cols-3 gap-4">
          {flags.map((flag, flagIndex) =>
            flag.formation.opponent.cards.map((card) => (
              <div key={card.id} onClick={() => onCapture(card, flagIndex)} className="cursor-pointer">
                <Card card={card} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
