import { useState } from 'react';

interface ShareMoveModalProps {
  shareUrl: string;
  opponentName: string;
  onDone: () => void;
}

/**
 * Appears after the local player completes their turn in url-async multiplayer.
 * Shows the shareable URL and instructions to send to the opponent.
 */
export function ShareMoveModal({ shareUrl, opponentName, onDone }: ShareMoveModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-8 max-w-lg w-full mx-4">

        <div className="text-center mb-6">
          <div className="text-3xl select-none mb-3">⚔</div>
          <h2 className="text-xl font-black text-amber-400 uppercase tracking-widest mb-1">
            Your Turn Is Done
          </h2>
          <p className="text-slate-400 text-sm">
            Send this link to <span className="text-white font-semibold">{opponentName}</span>.
            They'll open it to take their turn, then send you a new link.
          </p>
        </div>

        {/* URL display */}
        <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 mb-4 break-all text-xs text-slate-300 font-mono leading-relaxed max-h-24 overflow-y-auto select-all">
          {shareUrl}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className={`
              flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition
              ${copied
                ? 'bg-green-700 border border-green-500 text-green-200'
                : 'bg-amber-600 hover:bg-amber-500 text-black'}
            `}
          >
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={onDone}
            className="flex-1 py-3 rounded-xl font-semibold text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600 transition"
          >
            Done — Waiting
          </button>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          Come back when {opponentName} sends you their reply link.
        </p>
      </div>
    </div>
  );
}
