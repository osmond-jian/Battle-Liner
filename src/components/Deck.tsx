import { CardBack } from './CardBack';

interface DeckProps {
  cardsRemaining: number;
  variant?: 'troop' | 'tactic';
}

export function Deck({ cardsRemaining, variant = 'troop' }: DeckProps) {
  const isTactic = variant === 'tactic';
  const isEmpty = cardsRemaining === 0;

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Stacked shadow cards for depth effect */}
      <div className="relative">
        {cardsRemaining > 4 && (
          <div className={`absolute top-2.5 left-2.5 w-20 h-28 rounded-xl border-2 opacity-30
            ${isTactic ? 'border-amber-700 bg-amber-950' : 'border-blue-800 bg-blue-950'}`}
          />
        )}
        {cardsRemaining > 1 && (
          <div className={`absolute top-1 left-1 w-20 h-28 rounded-xl border-2 opacity-50
            ${isTactic ? 'border-amber-700 bg-amber-950' : 'border-blue-800 bg-blue-950'}`}
          />
        )}
        <CardBack variant={variant} className={isEmpty ? 'opacity-25 grayscale' : ''}>
          <span className={`font-bold text-xl select-none ${isEmpty ? 'text-gray-500' : 'text-white'}`}>
            {cardsRemaining}
          </span>
        </CardBack>
      </div>
      <span className={`text-[11px] font-medium tracking-wide ${isEmpty ? 'text-slate-600' : 'text-slate-400'}`}>
        {isTactic ? 'Tactics' : 'Troop'}
      </span>
    </div>
  );
}
