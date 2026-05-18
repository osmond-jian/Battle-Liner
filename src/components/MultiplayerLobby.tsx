import { useEffect, useRef, useState } from 'react';
import { getOrCreateProfile, saveProfile } from '../utils/playerProfile';
import { generateRoomCode } from '../utils/roomCode';
import { SERVER_URL } from '../utils/serverUrl';
import type { MultiplayerConfig } from '../types/multiplayer';

type LobbyView = 'main' | 'host' | 'join';
type ServerStatus = 'checking' | 'warming' | 'ready' | 'error';

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
  const roomCodeRef = useRef<string>('');
  const [roomCodeDisplay, setRoomCodeDisplay] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (view === 'host') {
      const code = generateRoomCode();
      roomCodeRef.current = code;
      setRoomCodeDisplay(code);
    } else {
      roomCodeRef.current = '';
      setRoomCodeDisplay('');
      setCopied(false);
    }
  }, [view]);

  // Join view
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');

  // ── Server warm-up ping ──────────────────────────────────────────────────
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
    const code = roomCodeRef.current || generateRoomCode();
    onStartGame({
      localPlayer: profile,
      opponentName: 'Opponent',
      isHost: true,
      transport: 'realtime',
      hostName: profile.username,
      guestName: 'Opponent',
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
      currentTurnName: 'Host',
      roomCode: code,
    });
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCodeDisplay).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const serverReady = serverStatus === 'ready';

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black tracking-widest text-amber-400 uppercase mb-1">
            Multiplayer
          </h1>
        </div>

        {/* Profile card */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 mb-4">
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
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-0.5">Playing as</p>
                <span className="font-bold text-white">{profile.username}</span>
              </div>
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
        {serverStatus === 'checking' && (
          <div className="flex items-center gap-2 px-4 py-3 mb-4 text-xs text-slate-500">
            <span className="inline-block w-2 h-2 rounded-full bg-slate-600 animate-pulse" />
            Connecting to server…
          </div>
        )}
        {serverStatus === 'warming' && (
          <div className="bg-amber-900/30 border border-amber-700/50 rounded-xl px-4 py-3 mb-4 text-xs text-amber-300 text-center">
            Server is starting up — this may take ~1 minute on first use.
          </div>
        )}
        {serverStatus === 'error' && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 mb-4 text-xs text-red-300 text-center">
            <p>Could not reach server. Check your connection and try again.</p>
            <p className="mt-1 text-red-400/70">
              Ad blockers may block this site's host domain — try disabling yours for this page.
              This will be resolved once the game moves to a custom domain instead of onRender.
            </p>
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
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-5">
              Host a Game
            </h2>

            <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Room code</p>
            <div className="flex items-center gap-3 mb-2">
              <p className="font-mono text-3xl text-amber-400 tracking-[0.3em] font-black select-all">
                {roomCodeDisplay}
              </p>
              <button
                onClick={handleCopyCode}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600 transition"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-slate-600 mb-6">
              Share this code with your opponent, then start the game.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleHost}
                disabled={!serverReady}
                className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-bold text-sm uppercase tracking-wide transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-amber-600"
              >
                Start Game
              </button>
              <button
                onClick={() => setView('main')}
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
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-5">
              Join a Game
            </h2>

            <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">
              Room code
            </label>
            <input
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-xl text-white font-mono tracking-[0.3em] uppercase text-center focus:outline-none focus:border-amber-500 mb-1"
              placeholder="ABC123"
              value={joinCodeInput}
              onChange={e => setJoinCodeInput(e.target.value.toUpperCase().slice(0, 6))}
              maxLength={6}
              autoFocus
            />
            {joinError && <p className="text-red-400 text-xs mt-1">{joinError}</p>}

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleJoin}
                disabled={!serverReady}
                className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-bold text-sm uppercase tracking-wide transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-amber-600"
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
