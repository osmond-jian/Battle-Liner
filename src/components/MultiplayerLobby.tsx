import { useEffect, useRef, useState } from 'react';
import { getOrCreateProfile, saveProfile } from '../utils/playerProfile';
import { generateRoomCode } from '../utils/roomCode';
import type { MultiplayerConfig } from '../types/multiplayer';

type LobbyView = 'main' | 'host' | 'join';
type ServerStatus = 'checking' | 'warming' | 'ready' | 'error';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';

interface MultiplayerLobbyProps {
  onStartGame: (config: MultiplayerConfig) => void;
  onBack: () => void;
}

export function MultiplayerLobby({ onStartGame, onBack }: MultiplayerLobbyProps) {
  const [profile, setProfile] = useState(() => getOrCreateProfile());
  const [usernameInput, setUsernameInput] = useState(profile.username);
  const [editingUsername, setEditingUsername] = useState(false);
  const [view, setView] = useState<LobbyView>('main');
  const [serverStatus, setServerStatus] = useState<ServerStatus>('checking');

  // Host view
  const [opponentNameInput, setOpponentNameInput] = useState('');
  const [hostError, setHostError] = useState('');
  // Generate room code once when entering host view; reset on leaving.
  const roomCodeRef = useRef<string>('');
  const [roomCodeDisplay, setRoomCodeDisplay] = useState('');
  useEffect(() => {
    if (view === 'host') {
      const code = generateRoomCode();
      roomCodeRef.current = code;
      setRoomCodeDisplay(code);
    } else {
      roomCodeRef.current = '';
      setRoomCodeDisplay('');
    }
  }, [view]);

  // Join view
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');

  // ── Server warm-up ping ──────────────────────────────────────────────────
  // Fires immediately on mount so the server starts waking up before the user
  // clicks Host/Join. After 3 s with no response we show a warming banner.
  useEffect(() => {
    const warmingTimer = setTimeout(() => setServerStatus('warming'), 3000);
    fetch(`${SERVER_URL}/health`)
      .then(r => (r.ok ? r.json() : Promise.reject('bad status')))
      .then(() => { clearTimeout(warmingTimer); setServerStatus('ready'); })
      .catch(() => { clearTimeout(warmingTimer); setServerStatus('error'); });
    return () => clearTimeout(warmingTimer);
  }, []);

  // ── Profile editing ──────────────────────────────────────────────────────
  const handleSaveUsername = () => {
    const trimmed = usernameInput.trim();
    if (!trimmed) return;
    const updated = { ...profile, username: trimmed };
    saveProfile(updated);
    setProfile(updated);
    setEditingUsername(false);
  };

  // ── Host game ────────────────────────────────────────────────────────────
  const handleHost = () => {
    const opp = opponentNameInput.trim();
    if (opp && opp === profile.username) {
      setHostError('Opponent name must differ from yours.');
      return;
    }
    setHostError('');
    const code = roomCodeRef.current || generateRoomCode();
    const opponentName = opp || 'Guest';

    onStartGame({
      localPlayer: profile,
      opponentName,
      isHost: true,
      transport: 'realtime',
      hostName: profile.username,
      guestName: opponentName,
      // Host starts as 'player'; INIT_STATE sent on connection randomises who goes first.
      currentTurnName: profile.username,
      roomCode: code,
    });
  };

  // ── Join game ────────────────────────────────────────────────────────────
  const handleJoin = () => {
    const code = joinCodeInput.trim().toUpperCase();
    if (code.length !== 6) {
      setJoinError('Enter the 6-character room code.');
      return;
    }
    setJoinError('');
    onStartGame({
      localPlayer: profile,
      opponentName: 'Host',
      isHost: false,
      transport: 'realtime',
      hostName: 'Host',
      guestName: profile.username,
      // Guest starts as 'opponent' (waiting) until INIT_STATE arrives.
      currentTurnName: 'Host',
      roomCode: code,
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-widest text-amber-400 uppercase mb-1">
            Battle Line
          </h1>
          <p className="text-slate-500 text-sm uppercase tracking-widest">Multiplayer</p>
        </div>

        {/* Profile card */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 mb-6">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Your Profile</p>
          {editingUsername ? (
            <div className="flex gap-2">
              <input
                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500"
                value={usernameInput}
                onChange={e => setUsernameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveUsername()}
                autoFocus
                maxLength={20}
              />
              <button
                onClick={handleSaveUsername}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-black text-sm font-bold transition"
              >
                Save
              </button>
              <button
                onClick={() => { setUsernameInput(profile.username); setEditingUsername(false); }}
                className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">{profile.username}</span>
              <button
                onClick={() => setEditingUsername(true)}
                className="text-xs text-slate-400 hover:text-slate-200 transition"
              >
                Edit name
              </button>
            </div>
          )}
        </div>

        {/* Server status banner */}
        {serverStatus === 'warming' && (
          <div className="bg-amber-900/30 border border-amber-700/50 rounded-xl px-4 py-3 mb-4 text-xs text-amber-300 text-center">
            Server is starting up — this may take ~1 minute on first use.
          </div>
        )}
        {serverStatus === 'error' && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 mb-4 text-xs text-red-300 text-center">
            Could not reach server. Check your connection and try again.
          </div>
        )}

        {/* Main view */}
        {view === 'main' && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setView('host')}
              className="w-full py-4 rounded-2xl bg-amber-600 hover:bg-amber-500 text-black font-black uppercase tracking-widest transition text-sm"
            >
              Host Game
            </button>
            <button
              onClick={() => setView('join')}
              className="w-full py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold uppercase tracking-widest border border-slate-600 transition text-sm"
            >
              Join Game
            </button>
            <button
              onClick={onBack}
              className="w-full py-3 rounded-2xl text-slate-500 hover:text-slate-300 text-sm transition"
            >
              Back
            </button>
          </div>
        )}

        {/* Host view */}
        {view === 'host' && (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-4">
              Host a Game
            </h2>

            <label className="block text-xs text-slate-500 uppercase tracking-widest mb-1">
              Opponent's name <span className="text-slate-600 normal-case">(optional)</span>
            </label>
            <input
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white mb-1 focus:outline-none focus:border-amber-500"
              placeholder="e.g. SwiftBlade42"
              value={opponentNameInput}
              onChange={e => setOpponentNameInput(e.target.value)}
              maxLength={20}
            />
            {hostError && <p className="text-red-400 text-xs mb-2">{hostError}</p>}

            <p className="text-xs text-slate-500 uppercase tracking-widest mt-5 mb-1">
              Room code
            </p>
            <p className="font-mono text-3xl text-amber-400 tracking-[0.3em] font-black mb-1 select-all">
              {roomCodeDisplay}
            </p>
            <p className="text-xs text-slate-600 mb-6">
              Share this 6-letter code with your opponent.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleHost}
                className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-bold text-sm uppercase tracking-wide transition"
              >
                Start Game
              </button>
              <button
                onClick={() => { setView('main'); setHostError(''); setOpponentNameInput(''); }}
                className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Join view */}
        {view === 'join' && (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-4">
              Join a Game
            </h2>

            <label className="block text-xs text-slate-500 uppercase tracking-widest mb-1">
              Room code
            </label>
            <input
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-xl text-white font-mono tracking-[0.3em] uppercase text-center focus:outline-none focus:border-amber-500"
              placeholder="ABC123"
              value={joinCodeInput}
              onChange={e => setJoinCodeInput(e.target.value.toUpperCase().slice(0, 6))}
              maxLength={6}
              autoFocus
            />
            {joinError && <p className="text-red-400 text-xs mt-1 mb-1">{joinError}</p>}

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleJoin}
                className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-bold text-sm uppercase tracking-wide transition"
              >
                Connect
              </button>
              <button
                onClick={() => { setView('main'); setJoinError(''); setJoinCodeInput(''); }}
                className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition"
              >
                Back
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
