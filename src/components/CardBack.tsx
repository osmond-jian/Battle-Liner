import React from 'react';

interface CardBackProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  id?: string;
  variant?: 'troop' | 'tactic';
}

export function CardBack({
  children,
  id,
  style,
  className = '',
  variant = 'troop',
  ...rest
}: CardBackProps) {
  const isTactic = variant === 'tactic';

  return (
    <div
      id={id}
      style={style}
      className={`
        w-20 h-28 rounded-xl border-2 overflow-hidden shadow-lg relative
        ${isTactic ? 'border-amber-700 bg-amber-950' : 'border-blue-800 bg-blue-950'}
        transition-transform duration-200
        ${className}
      `}
      {...rest}
    >
      {/* Diagonal cross-hatch pattern */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage: isTactic
            ? [
                'repeating-linear-gradient( 45deg, rgba(251,191,36,0.5) 0, rgba(251,191,36,0.5) 1px, transparent 1px, transparent 9px)',
                'repeating-linear-gradient(-45deg, rgba(251,191,36,0.5) 0, rgba(251,191,36,0.5) 1px, transparent 1px, transparent 9px)',
              ].join(', ')
            : [
                'repeating-linear-gradient( 45deg, rgba(96,165,250,0.5) 0, rgba(96,165,250,0.5) 1px, transparent 1px, transparent 9px)',
                'repeating-linear-gradient(-45deg, rgba(96,165,250,0.5) 0, rgba(96,165,250,0.5) 1px, transparent 1px, transparent 9px)',
              ].join(', '),
        }}
      />

      {/* Header + footer accent strips */}
      <div className={`absolute top-0 left-0 right-0 h-2.5 ${isTactic ? 'bg-amber-700' : 'bg-blue-800'}`} />
      <div className={`absolute bottom-0 left-0 right-0 h-2.5 ${isTactic ? 'bg-amber-700' : 'bg-blue-800'}`} />

      {/* Center emblem */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`
          w-10 h-10 rounded-full border-2 flex items-center justify-center text-base select-none
          ${isTactic ? 'border-amber-500 text-amber-400' : 'border-blue-500 text-blue-400'}
        `}>
          {isTactic ? '✦' : '⚔'}
        </div>
      </div>

      {children && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          {children}
        </div>
      )}
    </div>
  );
}
