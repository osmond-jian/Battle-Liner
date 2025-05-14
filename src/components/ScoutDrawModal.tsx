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
  onCancel
}: ScoutDrawModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-600 shadow-lg text-white max-w-xl">
        <h2 className="text-lg font-bold mb-4 text-center"> Scout: Draw {remaining} more card{remaining !== 1 ? 's' : ''}</h2>
        
        {remaining > 0 ? (
          // Step 1: Drawing cards
          <div className="flex justify-center gap-4 mb-4">
            <button className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded" onClick={onDrawFromTroop}>
              Draw from Troop
            </button>
            <button className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded" onClick={onDrawFromTactic}>
              Draw from Tactic
            </button>
          </div>
        ) : keep ? (
          // Step 2: Choose discard order
          <>
            <p className="text-sm text-center mb-2">Select which card to place first on top of the deck:</p>
            <div className="flex gap-4 justify-center mb-4">
              {discards?.map(card => (
                <Card key={card.id} card={card} onClick={() => onDiscardSelect(card)} />
              ))}
            </div>
          </>
        ) : (
          // Step 1b: Choose card to keep
          <>
            <p className="text-sm text-center mb-2">Pick one to keep:</p>
            <div className="flex gap-4 justify-center mb-4">
              {drawn.map(card => (
                <Card key={card.id} card={card} onClick={() => onPickFinal(card)} />
              ))}
            </div>
          </>
        )}


        <div className="flex justify-center mt-2">
          <button
            className="text-sm text-red-400 hover:underline"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
