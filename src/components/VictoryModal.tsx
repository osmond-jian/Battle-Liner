import { motion } from 'framer-motion';

interface VictoryModalProps {
  result: 'playerWon' | 'opponentWon';
  onPlayAgain: () => void;
}

export function VictoryModal({ result, onPlayAgain }: VictoryModalProps) {
  const playerWon = result === 'playerWon';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-80">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        className={`
          relative flex flex-col items-center gap-6 rounded-2xl p-12 shadow-2xl border-2 max-w-md w-full text-center
          ${playerWon
            ? 'bg-gradient-to-b from-yellow-900 to-gray-900 border-yellow-400'
            : 'bg-gradient-to-b from-red-950 to-gray-900 border-red-600'}
        `}
      >
        {/* Trophy / skull */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-7xl select-none"
        >
          {playerWon ? '🏆' : '💀'}
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={`text-4xl font-extrabold tracking-wide ${playerWon ? 'text-yellow-300' : 'text-red-400'}`}
        >
          {playerWon ? 'Victory!' : 'Defeated'}
        </motion.h1>

        {/* Sub-message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="text-gray-300 text-lg"
        >
          {playerWon
            ? 'Your forces have claimed the battle line!'
            : 'The enemy has broken through your defenses.'}
        </motion.p>

        {/* Play Again */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.97 }}
          onClick={onPlayAgain}
          className={`
            mt-2 px-8 py-3 rounded-xl font-bold text-lg shadow-lg transition-colors
            ${playerWon
              ? 'bg-yellow-400 hover:bg-yellow-300 text-black'
              : 'bg-red-600 hover:bg-red-500 text-white'}
          `}
        >
          Play Again
        </motion.button>
      </motion.div>
    </div>
  );
}
