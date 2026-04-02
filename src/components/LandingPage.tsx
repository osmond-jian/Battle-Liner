import { useState } from 'react';
import { FormationGuide } from './FormationGuide';
import { RulesPopup } from './RulesPopup';

interface LandingPageProps {
  onStart: () => void;
  onContinue?: () => void;
  hasSave?: boolean;
  saveDate?: Date | null;
}

const highlights = [
  {
    icon: '⚔',
    title: '9 Flags',
    body: 'Claim 5 flags to win, or 3 in a row for an immediate breakthrough victory.',
  },
  {
    icon: '🃏',
    title: 'Troop Cards',
    body: '60 cards across 6 colors, values 1–10. Build the strongest formation of 3 to claim a flag.',
  },
  {
    icon: '✦',
    title: 'Tactics Cards',
    body: '10 special cards: wild troops, fog, mud, scouts, and cards that steal or remove enemy pieces.',
  },
  {
    icon: '🏆',
    title: 'Formation Strength',
    body: 'Wedge > Phalanx > Battalion > Skirmish > Host. Ties broken by total value.',
  },
];

export function LandingPage({ onStart, onContinue, hasSave, saveDate }: LandingPageProps) {
  const [showGuide, setShowGuide] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [rulesTab, setRulesTab] = useState<'rules' | 'tactics'>('rules');

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 gap-8">

        {/* Title */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3 text-amber-400 text-4xl select-none">
            ⚔
          </div>
          <h1 className="text-6xl font-black tracking-widest uppercase text-amber-400 drop-shadow-lg">
            Battle Line
          </h1>
          <p className="text-slate-400 text-lg max-w-md mx-auto leading-relaxed">
            A two-player card game of military strategy. Deploy your troops, play tactics, and claim the battle line.
          </p>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          {hasSave && onContinue && (
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={onContinue}
                className="px-10 py-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black text-lg uppercase tracking-widest shadow-lg shadow-green-500/30 transition-all hover:scale-105 active:scale-100"
              >
                Continue
              </button>
              {saveDate && (
                <span className="text-xs text-slate-500">
                  {saveDate.toLocaleDateString()} {saveDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          )}
          <button
            onClick={onStart}
            className="px-10 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-lg uppercase tracking-widest shadow-lg shadow-amber-500/30 transition-all hover:scale-105 active:scale-100"
          >
            New Game
          </button>
          <button
            onClick={() => setShowRules(true)}
            className="px-8 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-base border border-slate-700 transition"
          >
            How to Play
          </button>
          <button
            onClick={() => setShowGuide(true)}
            className="px-8 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-base border border-slate-700 transition"
          >
            Card Reference
          </button>
        </div>
      </div>

      {/* ── Quick-reference highlights ────────────────────────────── */}
      <div className="border-t border-slate-800 px-6 py-10">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
          {highlights.map(h => (
            <div
              key={h.title}
              className="flex flex-col items-center text-center gap-2 p-4 rounded-xl bg-slate-900 border border-slate-800"
            >
              <span className="text-3xl select-none">{h.icon}</span>
              <span className="font-bold text-amber-400 text-sm uppercase tracking-wide">{h.title}</span>
              <p className="text-xs text-slate-400 leading-relaxed">{h.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div className="text-center py-4 text-xs text-slate-700 border-t border-slate-900">
        Based on the board game Battle Line by Reiner Knizia
      </div>

      {showGuide && <FormationGuide onClose={() => setShowGuide(false)} />}
      {showRules && (
        <RulesPopup
          onClose={() => setShowRules(false)}
          activeTab={rulesTab}
          onTabChange={setRulesTab}
        />
      )}
    </div>
  );
}
