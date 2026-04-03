import { useState } from 'react';
import type { LocalPlayer, MultiplayerConfig } from '../types/multiplayer';
import { getOrCreateProfile, saveProfile } from '../utils/playerProfile';

type LobbyView = 'main' | 'create' | 'join';

interface Props {
  onBack: () => void;
  onStartGame: (config: MultiplayerConfig) => void;
}

export function MultiplayerLobby({ onBack, onStartGame }: Props) {
  const [profile, setProfile] = useState<LocalPlayer>(() => getOrCreateProfile());
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.username);
  const [view, setView] = useState<LobbyView>('main');

  // Create-game state
  const [opponentNameInput, setOpponentNameInput] = useState('');
  const [createError, setCreateError] = useState('');

  // Join-game state
  const [joinNameInput, setJoinNameInput] = useState('');
  const [joinError, setJoinError] = useState('');

  const saveName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    const updated = { ...profile, username: trimmed };
    setProfile(updated);
    saveProfile(updated);
    setEditingName(false);
  };

  const handleCreate = () => {
    const opp = opponentNameInput.trim();
    if (!opp) { setCreateError("Enter your opponent's name."); return; }
    if (opp === profile.username) { setCreateError('Opponent name must differ from yours.'); return; }
    setCreateError('');

    // Randomly decide who goes first.
    const firstTurn = Math.random() < 0.5 ? profile.username : opp;

    onStartGame({
      localPlayer: profile,
      opponentName: opp,
      isHost: true,
      transport: 'url-async',
      hostName: profile.username,
      guestName: opp,
      currentTurnName: firstTurn,
    });
  };

  const handleJoin = () => {
    const hostName = joinNameInput.trim();
    if (!hostName) { setJoinError("Enter the host's name."); return; }
    if (hostName === profile.username) { setJoinError('Host name must differ from yours.'); return; }
    setJoinError('');

    // Guest does not know who goes first yet — that was encoded in the invite
    // link by the host. This config is only used if the guest navigates to the
    // lobby manually (without a ?game= URL). When they open an invite link,
    // App.tsx decodes everything from the URL and skips this screen entirely.
    // We default currentTurnName to the host so the game loads in waiting mode
    // until the guest receives the first link.
    onStartGame({
      localPlayer: profile,
      opponentName: hostName,
      isHost: false,
      transport: 'url-async',
      hostName,
      guestName: profile.username,
      currentTurnName: hostName,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-amber-400 text-3xl select-none mb-2">⚔</div>
          <h1 className="text-3xl font-black tracking-widest uppercase text-amber-400">
            Battle Line
          </h1>
          <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest">Multiplayer</p>
        </div>

        {/* Profile */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-700 to-blue-500 flex items-center justify-center text-sm font-bold text-blue-100 ring-2 ring-blue-400/30 shrink-0 select-none">
            {profile.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveName();
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                  autoFocus
                  maxLength={20}
                />
                <button
                  onClick={saveName}
                  className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white truncate">{profile.username}</span>
                <button
                  onClick={() => { setNameInput(profile.username); setEditingName(true); }}
                  className="text-slate-500 hover:text-slate-300 transition text-sm leading-none"
                  title="Edit username"
                >✏</button>
              </div>
            )}
            <p className="text-[11px] text-slate-600 mt-0.5">Your display name</p>
          </div>
        </div>

        {/* ── Main view ──────────────────────────────────────────────────── */}
        {view === 'main' && (
          <div className="space-y-3">

            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-2xl select-none shrink-0">🔗</span>
                <div>
                  <p className="font-bold text-white text-sm">Play by Invite Link</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    Take turns by sharing a link after each move. Works across any distance — no server needed.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setView('create')}
                  className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-black text-sm uppercase tracking-widest transition"
                >
                  Host Game
                </button>
                <button
                  onClick={() => setView('join')}
                  className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-black text-sm uppercase tracking-widest transition"
                >
                  Join Game
                </button>
              </div>
            </div>

            {/* Real-time coming soon */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 opacity-50 cursor-not-allowed select-none">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-2xl shrink-0">⚡</span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-400 text-sm">Real-Time Play</p>
                    <span className="text-[10px] uppercase tracking-widest bg-slate-700 text-slate-500 px-2 py-0.5 rounded-full">Coming Soon</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Live play with instant moves. Requires a server connection.
                  </p>
                </div>
              </div>
              <div className="w-full py-3 rounded-xl bg-slate-800 text-slate-600 font-bold text-sm uppercase tracking-widest text-center">
                Not Available Yet
              </div>
            </div>

            <button
              onClick={onBack}
              className="w-full py-3 text-slate-600 hover:text-slate-400 text-sm transition"
            >
              ← Back to Menu
            </button>
          </div>
        )}

        {/* ── Host / Create view ─────────────────────────────────────────── */}
        {view === 'create' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
              <p className="text-xs uppercase tracking-widest text-slate-500 mb-4">Host a Game</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Your name (host)</label>
                  <div className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-400">
                    {profile.username}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Opponent's name (guest)</label>
                  <input
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                    placeholder="e.g. IronAxe44"
                    value={opponentNameInput}
                    onChange={e => { setOpponentNameInput(e.target.value); setCreateError(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                    maxLength={20}
                    autoFocus
                  />
                  {createError && <p className="text-red-400 text-xs mt-1">{createError}</p>}
                </div>
              </div>

              <p className="text-xs text-slate-600 mt-4 leading-relaxed">
                Who goes first is decided randomly at game start. After your turn you will get a link to send to your opponent.
                Their username must match <span className="text-slate-400">"{opponentNameInput || '...'}"</span>.
              </p>
            </div>

            <button
              onClick={handleCreate}
              className="w-full py-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-black text-sm uppercase tracking-widest transition"
            >
              Start Game →
            </button>
            <button
              onClick={() => setView('main')}
              className="w-full py-2 text-slate-500 hover:text-slate-300 text-sm transition"
            >
              ← Back
            </button>
          </div>
        )}

        {/* ── Join view ──────────────────────────────────────────────────── */}
        {view === 'join' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
              <p className="text-xs uppercase tracking-widest text-slate-500 mb-4">Join a Game</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Your name (guest)</label>
                  <div className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-400">
                    {profile.username}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Host's name</label>
                  <input
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                    placeholder="e.g. SwiftKnight73"
                    value={joinNameInput}
                    onChange={e => { setJoinNameInput(e.target.value); setJoinError(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') handleJoin(); }}
                    maxLength={20}
                    autoFocus
                  />
                  {joinError && <p className="text-red-400 text-xs mt-1">{joinError}</p>}
                </div>
              </div>

              <p className="text-xs text-slate-600 mt-4 leading-relaxed">
                Once the host starts the game they will send you an invite link. Open that link to load your turn — you do not need to click anything here first.
              </p>
            </div>

            <button
              onClick={handleJoin}
              className="w-full py-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-black text-sm uppercase tracking-widest transition"
            >
              Ready to Join →
            </button>
            <button
              onClick={() => setView('main')}
              className="w-full py-2 text-slate-500 hover:text-slate-300 text-sm transition"
            >
              ← Back
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
