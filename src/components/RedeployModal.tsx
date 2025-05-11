import { useState } from 'react';
import { Flag } from '../types/game';

interface RedeployModalProps {
  flags: Flag[];
  onCancel: () => void;
  onConfirm: (sourceFlagIndex: number, cardIndex: number, destinationFlagIndex: number | null) => void;
}

export function RedeployModal({ flags, onCancel, onConfirm }: RedeployModalProps) {
  const [sourceFlagIndex, setSourceFlagIndex] = useState<number | null>(null);
  const [cardIndex, setCardIndex] = useState<number | null>(null);
  const [destinationFlagIndex, setDestinationFlagIndex] = useState<number | null>(null); // null = discard

  const playerFlagsWithCards = flags
    .map((f, i) => ({ index: i, cards: f.formation.player.cards }))
    .filter(f => f.cards.length > 0);

  const handleConfirm = () => {
    if (sourceFlagIndex !== null && cardIndex !== null) {
      onConfirm(sourceFlagIndex, cardIndex, destinationFlagIndex);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center">
      <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg max-w-lg w-full space-y-4">
        <h2 className="text-xl font-bold">Redeploy a Card</h2>

        {/* Step 1: Choose a card */}
        <div>
          <p className="font-semibold mb-1">1. Choose a card to move:</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {playerFlagsWithCards.map(flag => (
              <div key={flag.index} className="space-x-2">
                <span>Flag {flag.index + 1}:</span>
                {flag.cards.map((card, i) => (
                  <button
                    key={i}
                    className={`px-2 py-1 border rounded text-sm ${sourceFlagIndex === flag.index && cardIndex === i ? 'bg-yellow-500 text-black' : 'bg-gray-700'}`}
                    onClick={() => {
                      setSourceFlagIndex(flag.index);
                      setCardIndex(i);
                    }}
                  >
                    {card.name || `${card.color} ${card.value}`}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Step 2: Choose destination */}
        <div>
          <p className="font-semibold mb-1">2. Choose where to move it:</p>
          <div className="flex flex-wrap gap-2">
            {flags.map((_, i) => (
              <button
                key={i}
                className={`px-3 py-1 border rounded ${destinationFlagIndex === i ? 'bg-blue-500' : 'bg-gray-700'}`}
                onClick={() => setDestinationFlagIndex(i)}
              >
                Flag {i + 1}
              </button>
            ))}
            <button
              className={`px-3 py-1 border rounded ${destinationFlagIndex === null ? 'bg-red-500' : 'bg-gray-700'}`}
              onClick={() => setDestinationFlagIndex(null)}
            >
              Discard
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-600 rounded">Cancel</button>
          <button onClick={handleConfirm} className="px-4 py-2 bg-green-500 text-black font-bold rounded">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
