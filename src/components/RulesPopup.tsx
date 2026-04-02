interface Props {
  onClose: () => void;
  activeTab: 'rules' | 'tactics';
  onTabChange: (tab: 'rules' | 'tactics') => void;
}

const TACTICS = [
  {
    name: 'Leader',
    count: 2,
    effect: 'Wild card — can act as any troop of any color and value you choose when played.',
  },
  {
    name: 'Companion Cavalry',
    count: 1,
    effect: 'Wild card that counts as value 8 in any color you choose.',
  },
  {
    name: 'Shield Bearers',
    count: 1,
    effect: 'Wild card that counts as value 1, 2, or 3 in any color you choose.',
  },
  {
    name: 'Fog',
    count: 1,
    effect:
      'Place on any flag. That flag is now judged by total card value only — formation type is ignored for both sides. Cannot be played on a flag that has already been won.',
  },
  {
    name: 'Mud',
    count: 1,
    effect:
      'Place on any flag. Both sides must now play 4 cards instead of 3 to that flag. Cannot be played on a flag that has already been won.',
  },
  {
    name: 'Scout',
    count: 1,
    effect:
      'Draw 3 cards from any mix of the troop and tactic decks, keep 1, then return the other 2 to the tops of their respective decks in any order. You still draw normally at end of turn.',
  },
  {
    name: 'Redeploy',
    count: 1,
    effect:
      'Move one of your own cards from any flag to another flag (if there is room), or discard it to the bottom of its deck.',
  },
  {
    name: 'Deserter',
    count: 1,
    effect:
      "Remove one of the opponent's cards from any flag and discard it. The flag is not awarded to you automatically — it must still be won normally.",
  },
  {
    name: 'Traitor',
    count: 1,
    effect:
      "Capture one of the opponent's troop cards (not a wild/tactic) from any flag and move it to your side of any flag that has room. Can go to the same flag it was taken from.",
  },
];

export function RulesPopup({ onClose, activeTab, onTabChange }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full mx-4 flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
          <h2 className="text-xl font-black text-amber-400 uppercase tracking-widest">Battle Line</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl leading-none px-2 py-1 rounded hover:bg-slate-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pb-0 shrink-0 border-b border-slate-700">
          {(['rules', 'tactics'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`
                px-5 py-2 text-sm font-semibold uppercase tracking-wide rounded-t-lg -mb-px border-b-2 transition
                ${activeTab === tab
                  ? 'text-amber-400 border-amber-400 bg-slate-800'
                  : 'text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-600'}
              `}
            >
              {tab === 'rules' ? 'Rules' : 'Tactics'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-6 py-5 text-sm text-slate-300 leading-relaxed space-y-4">
          {activeTab === 'rules' ? (
            <>
              <p>
                In Battle Line, players compete to control 9 flags by building the strongest 3-card
                formations at each one.
              </p>
              <p>
                Each turn, play one card from your hand to an unclaimed flag, then <strong>draw one card</strong> from
                either the troop deck or the tactic deck to end your turn.
              </p>
              <p>
                A flag is claimed when your formation is complete and the opponent can no longer beat
                it with the cards still available. Win by claiming <strong>5 flags total</strong> or{' '}
                <strong>3 adjacent flags</strong> in a row.
              </p>

              <div className="border-t border-slate-700 pt-4">
                <p className="font-bold text-white mb-2 uppercase tracking-wide text-xs">Formations (strongest → weakest)</p>
                <ul className="space-y-2">
                  <li><span className="text-amber-400 font-semibold">Wedge</span> — 3 same-color cards with consecutive values <span className="text-slate-500">(e.g. R3 R4 R5)</span></li>
                  <li><span className="text-amber-400 font-semibold">Phalanx</span> — 3 cards of the same value <span className="text-slate-500">(e.g. R8 Y8 G8)</span></li>
                  <li><span className="text-amber-400 font-semibold">Battalion Order</span> — 3 cards of the same color <span className="text-slate-500">(e.g. B2 B4 B7)</span></li>
                  <li><span className="text-amber-400 font-semibold">Skirmish Line</span> — 3 cards with consecutive values, any color <span className="text-slate-500">(e.g. R4 G5 Y6)</span></li>
                  <li><span className="text-amber-400 font-semibold">Host</span> — Any other combination. Ties broken by total value.</li>
                </ul>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <p className="font-bold text-white mb-2 uppercase tracking-wide text-xs">Tactics</p>
                <p>
                  You may play at most <strong>one more tactic card than your opponent</strong> at any time.
                  Drawing from the tactic deck counts as your tactic play for the turn. Wild-card tactics
                  (Leader, Companion Cavalry, Shield Bearers) occupy a card slot at a flag just like
                  troop cards.
                </p>
              </div>
            </>
          ) : (
            <ul className="space-y-4">
              {TACTICS.map(t => (
                <li key={t.name} className="flex gap-3">
                  <div className="shrink-0 mt-0.5">
                    <span className="inline-block bg-amber-900/60 border border-amber-700 text-amber-300 text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wide">
                      {t.name}
                    </span>
                    {t.count > 1 && (
                      <span className="ml-1.5 text-xs text-slate-500">×{t.count}</span>
                    )}
                  </div>
                  <p className="text-slate-300">{t.effect}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
