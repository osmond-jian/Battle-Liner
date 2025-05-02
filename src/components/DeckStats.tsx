import { Card, CardColor, CardValue, Flag } from '../types/game';

interface Props {
  onClose: () => void;
  deck: Card[];
  playerHand: Card[];
  opponentHand: Card[];
  flags: Flag[];
}

const COLORS: CardColor[] = ['red', 'blue', 'green', 'orange', 'purple', 'yellow'];
const VALUES: CardValue[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Tailwind classes for background colors by card color
const colorClasses: Record<CardColor, string> = {
  red: 'bg-red-600',
  blue: 'bg-blue-600',
  green: 'bg-green-600',
  orange: 'bg-orange-500',
  purple: 'bg-purple-600',
  yellow: 'bg-yellow-400 text-yellow-900',
};

export function DeckStats({ onClose, deck, playerHand, opponentHand, flags }: Props) {
  const availableCards: Card[] = [...deck, ...opponentHand];

  const isCardAvailable = (color: CardColor, value: CardValue) => {
    return availableCards.some(card => card.color === color && card.value === value);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-3xl w-full shadow-xl text-white space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-bold">Deck Stats</h2>
          <button
            onClick={onClose}
            className="text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {COLORS.map(color => (
            <div key={color}>
              <h3 className="text-lg capitalize font-semibold mb-1">{color}</h3>
              <div className="flex gap-1 flex-wrap">
                {VALUES.map(value => {
                  const available = isCardAvailable(color, value);
                  const baseClass = available
                    ? `${colorClasses[color]} text-white`
                    : 'bg-gray-900 text-red-400 border border-red-500';

                  return (
                    <div
                      key={`${color}-${value}`}
                      className={`w-8 h-8 flex items-center justify-center text-sm font-bold rounded ${baseClass}`}
                    >
                      {available ? value : 'X'}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 pt-2">
          Cards in the opponent's hand are still shown here because you don’t know what they are.
        </p>
      </div>
    </div>
  );
}
