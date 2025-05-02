// import React from 'react';

interface Props {
  onClose: () => void;
}

export function RulesPopup({ onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-2xl w-full shadow-xl text-white space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-bold">Battle Line Rules</h2>
          <button
            onClick={onClose}
            className="text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded"
          >
            Close
          </button>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed max-h-[60vh] overflow-y-auto">
          In Battle Line, players compete to control 9 flags by building the strongest 3-card formations at each one.
          <br /><br />
          Each turn, a player selects a card from their hand and plays it to an unclaimed flag. They then draw a new card. 
          <br /><br />
          Formations (from strongest to weakest):
          <ul className="list-disc list-inside mt-2">
            <li><strong>Wedge:</strong> 3 same-color cards with consecutive values (e.g. R3 R4 R5)</li>
            <li><strong>Phalanx:</strong> 3 cards of the same value (e.g. R8 Y8 G8)</li>
            <li><strong>Battalion Order:</strong> 3 cards of the same color (e.g. B2 B4 B7)</li>
            <li><strong>Skirmish Line:</strong> 3 cards with consecutive values, any color (e.g. R4 G5 Y6)</li>
            <li><strong>Host:</strong> Any other combination</li>
          </ul>
          <br />
          A player captures a flag if their formation is stronger and the opponent can no longer beat it with their remaining cards. 
          Win by claiming 3 adjacent flags or 5 total flags.
        </p>
      </div>
    </div>
  );
}
