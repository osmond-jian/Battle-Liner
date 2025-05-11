import { CardBack } from './CardBack';

interface DeckProps {
  cardsRemaining: number;
  totalCards?: number;
  variant?: 'troop' | 'tactic';
}

export function Deck({ cardsRemaining, variant = 'troop' }: DeckProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <CardBack variant={variant}>
        <span className="text-white font-bold text-lg">{cardsRemaining}</span>
      </CardBack>
      <span className="text-sm text-gray-300 font-medium">
        {variant === 'troop' ? 'Troop Deck' : 'Tactics Deck'}
      </span>
    </div>
  );
}
