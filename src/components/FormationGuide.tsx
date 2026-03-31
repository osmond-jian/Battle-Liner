import { useState } from 'react';
import { Card } from './Card';
import { Card as CardType, CardColor, CardValue } from '../types/game';

// ─── Formation data ───────────────────────────────────────────────────────────

const toCard = (id: string, value: CardValue, color: CardColor): CardType => ({
  id, value, color, type: 'troop',
});

const formations = [
  {
    rank: 1,
    name: 'Wedge',
    description: 'Three cards of the same color with consecutive values. Strongest formation.',
    cards: [toCard('r3', 3, 'red'), toCard('r4', 4, 'red'), toCard('r5', 5, 'red')],
  },
  {
    rank: 2,
    name: 'Phalanx',
    description: 'Three cards of the same value.',
    cards: [toCard('y8', 8, 'yellow'), toCard('r8', 8, 'red'), toCard('g8', 8, 'green')],
  },
  {
    rank: 3,
    name: 'Battalion Order',
    description: 'Three cards of the same color (but not consecutive).',
    cards: [toCard('b2', 2, 'blue'), toCard('b4', 4, 'blue'), toCard('b7', 7, 'blue')],
  },
  {
    rank: 4,
    name: 'Skirmish Line',
    description: 'Three cards with consecutive values (but not the same color).',
    cards: [toCard('g4', 4, 'green'), toCard('r5', 5, 'red'), toCard('y6', 6, 'yellow')],
  },
  {
    rank: 5,
    name: 'Host',
    description: 'Any other combination of three cards. Weakest formation.',
    cards: [toCard('g3', 3, 'green'), toCard('y5', 5, 'yellow'), toCard('b8', 8, 'blue')],
  },
];

// ─── Tactics data ─────────────────────────────────────────────────────────────

interface TacticEntry {
  name: string;
  category: 'Morale' | 'Guile';
  effect: string;
  detail: string;
}

const tactics: TacticEntry[] = [
  // Morale Tactics — act as wild troops
  {
    name: 'Leader',
    category: 'Morale',
    effect: 'Wild card — any color and value (1–10).',
    detail:
      'When played, choose any color and value for this card. It counts as a troop of that type for formation purposes.',
  },
  {
    name: 'Companion Cavalry',
    category: 'Morale',
    effect: 'Wild card — any color, fixed value 8.',
    detail:
      'When played, choose any color. Its value is always 8. Useful for filling a flush or reaching a high total.',
  },
  {
    name: 'Shield Bearers',
    category: 'Morale',
    effect: 'Wild card — any color, value 1–3.',
    detail:
      'When played, choose any color and a value of 1, 2, or 3. Helpful for completing low-value straights or flushes.',
  },
  // Guile Tactics — environmental or theft effects
  {
    name: 'Fog',
    category: 'Guile',
    effect: 'Formation type is ignored — winner is decided by highest total only.',
    detail:
      'Play on any flag. Once Fog is in effect, the winner of that flag is whichever side has the highest sum of card values — formation type (Wedge, Phalanx, etc.) is completely disregarded.',
  },
  {
    name: 'Mud',
    category: 'Guile',
    effect: 'Each side must play 4 cards to this flag instead of 3.',
    detail:
      'Play on any flag to extend the battle. Both sides need four cards to claim the flag, making it harder to win early but potentially more rewarding.',
  },
  {
    name: 'Scout',
    category: 'Guile',
    effect: 'Draw 3 cards from any decks, keep 1, return 2.',
    detail:
      'Draw three cards (in any combination from the troop and tactic decks). Keep one to add to your hand, then choose the order to place the other two back on top of their decks.',
  },
  {
    name: 'Redeploy',
    category: 'Guile',
    effect: 'Move one of your own cards to a different flag, or return it to its deck.',
    detail:
      'Select any card from your formations. Move it to another flag where you have fewer than the required cards, or discard it back to the bottom of its appropriate deck.',
  },
  {
    name: 'Deserter',
    category: 'Guile',
    effect: "Remove one of the opponent's cards from any flag and discard it.",
    detail:
      "Choose any card from any of the opponent's formations and remove it from the game. This can break a strong formation the opponent is building.",
  },
  {
    name: 'Traitor',
    category: 'Guile',
    effect: "Steal one of the opponent's troop cards and add it to one of your own formations.",
    detail:
      "Choose any troop card (not a tactic) from the opponent's formations. It moves to a formation of your choice, weakening their line and strengthening yours simultaneously.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

type Tab = 'formations' | 'tactics';

type Props = {
  onClose: () => void;
};

export function FormationGuide({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('formations');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-3xl w-full shadow-xl text-white flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h2 className="text-2xl font-bold">Game Reference</h2>
          <button
            onClick={onClose}
            className="text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded"
          >
            Close
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 shrink-0">
          <button
            onClick={() => setActiveTab('formations')}
            className={`px-4 py-2 rounded font-semibold transition ${
              activeTab === 'formations'
                ? 'bg-yellow-400 text-black'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Formations
          </button>
          <button
            onClick={() => setActiveTab('tactics')}
            className={`px-4 py-2 rounded font-semibold transition ${
              activeTab === 'tactics'
                ? 'bg-yellow-400 text-black'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Tactics Cards
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="overflow-y-auto flex-1 pr-1">

          {activeTab === 'formations' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-400">Listed from strongest (#1) to weakest (#5).</p>
              {formations.map(f => (
                <div key={f.name}>
                  <h3 className="text-lg font-semibold">#{f.rank} – {f.name}</h3>
                  <p className="text-sm text-gray-300 mb-2">{f.description}</p>
                  <div className="flex gap-2">
                    {f.cards.map((card: CardType) => (
                      <Card key={card.id} card={card} selected={false} onClick={() => {}} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'tactics' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                You may never have played more tactic cards than your opponent plus one.
              </p>

              {(['Morale', 'Guile'] as const).map(category => (
                <div key={category}>
                  <h3 className={`text-base font-bold uppercase tracking-widest mb-3 ${
                    category === 'Morale' ? 'text-yellow-400' : 'text-blue-400'
                  }`}>
                    {category} Tactics
                  </h3>
                  <div className="space-y-3">
                    {tactics.filter(t => t.category === category).map(t => (
                      <div
                        key={t.name}
                        className={`rounded-lg p-3 border ${
                          category === 'Morale'
                            ? 'bg-yellow-900/20 border-yellow-700/40'
                            : 'bg-blue-900/20 border-blue-700/40'
                        }`}
                      >
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="font-bold text-white">{t.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            category === 'Morale'
                              ? 'bg-yellow-600 text-black'
                              : 'bg-blue-700 text-white'
                          }`}>
                            {category}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-200 mb-1">{t.effect}</p>
                        <p className="text-xs text-gray-400">{t.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
