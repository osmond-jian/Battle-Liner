import React from 'react';
import { Card as CardType } from '../types/game';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  selected?: boolean;
  condensed?: boolean;
}

const colorMap = {
  red: 'bg-red-500 text-white border-red-700',
  blue: 'bg-blue-500 text-white border-blue-700',
  green: 'bg-green-500 text-white border-green-700',
  orange: 'bg-orange-500 text-white border-orange-700',
  purple: 'bg-purple-500 text-white border-purple-700',
  yellow: 'bg-yellow-500 text-yellow-900 border-yellow-700'
};

export function Card({ card, onClick, selected, condensed = false }: CardProps) {
  const baseClasses = `
    ${colorMap[card.color]}
    ${selected ? 'ring-4 ring-white ring-offset-4 ring-offset-gray-900 scale-110' : ''}
    border-2 shadow-md transition-all duration-200
  `;

  if (condensed) {
    return (
      <div
        className={`
          ${baseClasses}
          w-20 h-8 rounded-md
          flex items-center justify-between px-2
          text-sm font-semibold
        `}
      >
        <span>{card.value}</span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`
        ${baseClasses}
        w-20 h-32 rounded-lg
        flex flex-col items-center justify-center gap-1
        cursor-pointer hover:scale-105
      `}
    >
      <span className="text-3xl font-bold">{card.value}</span>
    </div>
  );
}