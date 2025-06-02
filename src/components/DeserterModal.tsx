import { Card as CardType, Flag as FlagType } from '../types/game';
import { Card } from './Card';

interface DeserterModalProps {
  flags: FlagType[];
  onConfirm: (card: CardType, flagIndex: number) => void;
  onCancel: () => void;
}

export function DeserterModal({ flags, onConfirm, onCancel }: DeserterModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-600 shadow-lg max-w-3xl w-full">
        <h2 className="text-xl font-bold text-red-400 mb-4">Select an opponent's card to discard</h2>
        <div className="grid grid-cols-3 gap-4">
          {flags.map((flag, flagIndex) =>
            flag.formation.opponent.cards.map((card) => (
              <div key={card.id} onClick={() => onConfirm(card, flagIndex)} className="cursor-pointer">
                <Card card={card} />
              </div>
            ))
          )}
        </div>
        <div className="mt-4 text-right">
          <button onClick={onCancel} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
