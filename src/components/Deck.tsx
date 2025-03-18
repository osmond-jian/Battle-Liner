import React from 'react';

interface DeckProps {
  cardsRemaining: number;
  totalCards: number;
}

export function Deck({ cardsRemaining, totalCards }: DeckProps) {
  const percentage = (cardsRemaining / totalCards) * 100;
  const height = Math.max(32, (percentage / 100) * 128); // Min height of 32px, max height of 128px

  return (
    <div className="flex flex-col items-center gap-2">
      <div 
        className="w-20 rounded-lg bg-gray-800 shadow-md transition-all duration-300 relative overflow-hidden border-2 border-gray-700"
        style={{ height: `${height}px` }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold">{cardsRemaining}</span>
        </div>
        <div className="absolute inset-0">
          <div className="w-full h-full bg-gradient-to-br from-gray-700/30 to-transparent" />
        </div>
      </div>
      <span className="text-sm text-gray-300 font-medium">Cards Left</span>
    </div>
  );
}