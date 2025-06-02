import React from 'react';
import { Card as CardType } from '../types/game';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  card: CardType;
  onClick?: () => void;
  selected?: boolean;
  condensed?: boolean;
  id?: string;
  className?: string;
}

const colorMap = {
  red:    'bg-red-500 text-white border-red-700',
  blue:   'bg-blue-500 text-white border-blue-700',
  green:  'bg-green-500 text-white border-green-700',
  orange: 'bg-orange-500 text-white border-orange-700',
  purple: 'bg-purple-500 text-white border-purple-700',
  yellow: 'bg-yellow-500 text-yellow-900 border-yellow-700'
};

// For consistent tactics cards
const tacticsClass = 'bg-slate-700 text-white border-slate-500';

export function Card({
  card,
  onClick,
  selected,
  condensed = false,
  id,
  className = '',
  ...rest
}: CardProps) {
  const isTactic = card.type === 'tactic';
  const colorClass = isTactic
    ? tacticsClass
    : card.color
    ? colorMap[card.color]
    : 'bg-gray-700 border-gray-600';

  const baseClasses = `
    ${colorClass}
    ${selected ? 'ring-4 ring-white ring-offset-4 ring-offset-gray-900 scale-110' : ''}
    border-2 shadow-md transition-all duration-200
  `;

  if (condensed) {
    return (
      <div
        id={id}
        className={`
          ${baseClasses}
          w-20 h-8 rounded-md
          flex items-center justify-between px-2
          text-sm font-semibold
          ${className}
        `}
        {...rest}
      >
        <span>{isTactic ? card.name : card.value}</span>
      </div>
    );
  }

  return (
    <div
      id={id}
      onClick={onClick}
      className={`
        ${baseClasses}
        w-20 h-32 rounded-lg
        flex flex-col items-center justify-center gap-1
        cursor-pointer hover:scale-105
        ${className}
      `}
      {...rest}
    >
      {isTactic ? (
        <>
          <span className="text-xs uppercase tracking-wide text-yellow-400">Tactic</span>
          <span className="text-sm font-semibold text-center px-2">{card.name}</span>
        </>
      ) : (
        <span className="text-3xl font-bold">{card.value}</span>
      )}
    </div>
  );
}
