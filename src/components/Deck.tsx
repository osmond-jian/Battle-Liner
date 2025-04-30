import React from 'react';
import { CardBack } from './CardBack';

interface DeckProps {
  cardsRemaining: number;
  totalCards: number;
}

export function Deck({ cardsRemaining }: DeckProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <CardBack>
        <span className="text-white bg-opacity-0 font-bold text-lg">{cardsRemaining}</span>
      </CardBack>
      <span className="text-sm text-gray-300 font-medium">Cards Left</span>
    </div>
  );
}
