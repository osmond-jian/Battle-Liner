import { Card } from './Card';
import { Card as CardType, CardColor, CardValue } from '../types/game';

// Helper function to cast color strings correctly
const toCard = (id: string, value: CardValue, color: CardColor): CardType => ({ id, value, color });

const formations = [
  {
    name: 'Wedge',
    rank:1,
    description: 'Three cards of the same color with consecutive values.',
    cards: [
      toCard('r3', 3, 'red'),
      toCard('r4', 4, 'red'),
      toCard('r5', 5, 'red'),
    ],
  },
  {
    name: 'Phalanx',
    rank:2,
    description: 'Three cards of the same value.',
    cards: [
      toCard('y8', 8, 'yellow'),
      toCard('r8', 8, 'red'),
      toCard('g8', 8, 'green'),
    ],
  },
  {
    name: 'Battalion Order',
    rank:3,
    description: 'Three cards of the same color.',
    cards: [
      toCard('b2', 2, 'blue'),
      toCard('b4', 4, 'blue'),
      toCard('b7', 7, 'blue'),
    ],
  },
  {
    name: 'Skirmish Line',
    rank:4,
    description: 'Three cards with consecutive values.',
    cards: [
      toCard('g5', 5, 'green'),
      toCard('r6', 6, 'red'),
      toCard('y4', 4, 'yellow'),
    ],
  },
  {
    name: 'Host',
    rank:5,
    description: 'Any other formation.',
    cards: [
      toCard('g3', 3, 'green'),
      toCard('y5', 5, 'yellow'),
      toCard('b5', 5, 'blue'),
    ],
  },
];

type Props = {
  onClose: () => void;
};

export function FormationGuide({ onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-3xl w-full shadow-xl text-white">
        <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Formations</h2>
            <p className="text-sm text-gray-400 mb-4">
            Listed from strongest (#1) to weakest (#5)
            </p>
          <button
            onClick={onClose}
            className="text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded"
          >
            Close
          </button>
        </div>
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          {formations.map((formation) => (
            <div key={formation.name}>
                <h3 className="text-lg font-semibold">
                    #{formation.rank} – {formation.name}
                </h3>
              <p className="text-sm text-gray-300 mb-2">{formation.description}</p>
              <div className="flex gap-2">
                {formation.cards.map((card: CardType) => (
                  <Card key={card.id} card={card} selected={false} onClick={() => {}} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

