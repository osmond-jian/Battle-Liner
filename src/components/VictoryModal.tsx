import { motion } from 'framer-motion';

export type RematchPending = 'none' | 'sent' | 'received';

interface VictoryModalProps {
  result: 'playerWon' | 'opponentWon' | 'draw';
  onPlayAgain: () => void;
  onDismiss: () => void;
  isMultiplayer?: boolean;
  rematchPending?: RematchPending;
  onProposeRematch?: () => void;
  onAcceptRematch?: () => void;
}

export function VictoryModal({
  result,
  onPlayAgain,
  onDismiss,
  isMultiplayer = false,
  rematchPending = 'none',
  onProposeRematch,
  onAcceptRematch,
}: VictoryModalProps) {
  const playerWon = result === 'playerWon';
  const isDraw    = result === 'draw';

  const borderColor = playerWon ? 'border-yellow-400' : isDraw ? 'border-slate-500' : 'border-red-600';
  const bgGradient  = playerWon
    ? 'from-yellow-900 to-gray-900'
    : isDraw
    ? 'from-slate-800 to-gray-900'
    : 'from-red-950 to-gray-900';
  const headlineColor = playerWon ? 'text-yellow-300' : isDraw ? 'text-slate-300' : 'text-red-400';
  const primaryBtnClass = playerWon
    ? 'bg-yellow-400 hover:bg-yellow-300 text-black'
    : isDraw
    ? 'bg-slate-500 hover:bg-slate-400 text-white'
    : 'bg-red-600 hover:bg-red-500 text-white';

  const icon     = playerWon ? '🏆' : isDraw ? '🤝' : '💀';
  const headline = playerWon ? 'Victory!'  : isDraw ? 'Draw!'    : 'Defeated';
  const subline  = playerWon
    ? 'Your forces have claimed the battle line!'
    : isDraw
    ? 'The battle line holds — neither side could break through.'
    : 'The enemy has broken through your defenses.';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-80">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        className={`
          relative flex flex-col items-center gap-6 rounded-2xl p-12 shadow-2xl border-2 max-w-md w-full text-center
          bg-gradient-to-b ${bgGradient} ${borderColor}
        `}
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-7xl select-none"
        >
          {icon}
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={`text-4xl font-extrabold tracking-wide ${headlineColor}`}
        >
          {headline}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="text-gray-300 text-lg"
        >
          {subline}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col gap-3 w-full mt-2"
        >
          {/* ── Multiplayer rematch flow ─────────────────────────── */}
          {isMultiplayer ? (
            <>
              {rematchPending === 'received' ? (
                <>
                  <p className="text-amber-300 text-sm font-semibold">
                    Opponent wants a rematch!
                  </p>
                  <button
                    onClick={onAcceptRematch}
                    className={`px-8 py-3 rounded-xl font-bold text-lg shadow-lg transition hover:scale-105 active:scale-100 ${primaryBtnClass}`}
                  >
                    Accept Rematch
                  </button>
                </>
              ) : rematchPending === 'sent' ? (
                <p className="text-slate-400 text-sm py-3 animate-pulse">
                  Waiting for opponent to accept…
                </p>
              ) : (
                <button
                  onClick={onProposeRematch}
                  className={`px-8 py-3 rounded-xl font-bold text-lg shadow-lg transition hover:scale-105 active:scale-100 ${primaryBtnClass}`}
                >
                  Propose Rematch
                </button>
              )}
            </>
          ) : (
            /* ── Solo: plain play-again ─────────────────────────── */
            <button
              onClick={onPlayAgain}
              className={`px-8 py-3 rounded-xl font-bold text-lg shadow-lg transition hover:scale-105 active:scale-100 ${primaryBtnClass}`}
            >
              Play Again
            </button>
          )}

          <button
            onClick={onDismiss}
            className="px-8 py-3 rounded-xl font-semibold text-base bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 transition"
          >
            Inspect Board
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
