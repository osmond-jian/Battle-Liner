import { Flag as FlagType } from '../types/game';
import { Card } from './Card';
import type {Card as CardType} from '../types/game';

interface FlagProps {
  flag: FlagType;
  onCardPlace?: () => void;
  selected?: boolean;
  onDeserterSelect?: (card: CardType, flagIndex: number) => void;
  deserterActive?: boolean;
  flagIndex:number;
  traitorActive?: boolean;
  onTraitorSelect?: (card: CardType, fromFlagIndex: number) => void;
  pendingTraitor?: { card: CardType; fromFlag: number } | null;
  onTraitorDestination?: (toFlagIndex: number) => void;

}

export function Flag({ 
  flag,
  onCardPlace, 
  selected,
  deserterActive = false,
  onDeserterSelect,
  flagIndex,
  traitorActive=false,
  onTraitorSelect,
  pendingTraitor,
  onTraitorDestination,
  
}: FlagProps) {
  return (
    <div 
      className={`
        flex flex-col items-center gap-2 p-4 rounded-lg relative
        ${selected ? 'bg-blue-900/50 ring-2 ring-blue-500' : ''}
        ${
          pendingTraitor &&
          flagIndex !== pendingTraitor.fromFlag &&
          flag.formation.player.cards.length < 3 &&
          !flag.winner
            ? 'ring-2 ring-yellow-400 bg-yellow-400/10 cursor-pointer'
            : 'hover:bg-gray-800/50'
        }
        transition-colors duration-200
      `}
      onClick={() => {
        if (
          pendingTraitor &&
          flagIndex !== pendingTraitor.fromFlag &&
          flag.formation.player.cards.length < 3 &&
          !flag.winner &&
          onTraitorDestination
        ) {
          onTraitorDestination(flagIndex);
        } else {
          onCardPlace?.();
        }
      }}
    >

      {flag.modifiers.includes('fog') && (
        <div className="text-xs text-gray-400 absolute bottom-1 left-1">🌫️ Fog</div>
      )}
      {flag.modifiers.includes('mud') && (
        <div className="text-xs text-yellow-400 absolute bottom-1 right-1">💧 Mud</div>
      )}
      
      <div className="flex flex-col gap-4 items-center">
        {/* Opponent's cards */}
        <div className="relative h-24 w-20">
          {flag.formation.opponent.cards.map((card, index) => (
            <div
              key={card.id}
              className="absolute w-full"
              style={{
                top: `${index * 24}px`,
                zIndex: index,
              }}
            >
              <Card
                card={card}
                condensed
                onClick={() => {
                  if (deserterActive && onDeserterSelect) {
                    onDeserterSelect(card, flagIndex);
                  } else if (traitorActive && onTraitorSelect && card.type === 'troop') {
                    onTraitorSelect(card, flagIndex);
                  }
                }}
                className={
                  (deserterActive || traitorActive) ? 'ring-2 ring-red-400 cursor-pointer' : ''
                }
              />
            </div>
          ))}
        </div>
        
        {/* Flag indicator */}
        <div className={`
          w-12 h-20 rounded-lg border-2 relative
          ${flag.winner === 'player' ? 'bg-green-500 border-green-700' : 
            flag.winner === 'opponent' ? 'bg-red-500 border-red-700' : 
            'bg-gray-700 border-gray-600'}
          transition-colors duration-300
        `}>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`
              text-lg font-bold
              ${flag.winner ? 'text-white' : 'text-gray-300'}
            `}>
              {flag.id}
            </span>
          </div>
          {flag.winner && (
            <div className={`
              absolute ${flag.winner === 'player' ? '-bottom-2' : '-top-2'}
              left-1/2 transform -translate-x-1/2
              w-3 h-3
              ${flag.winner === 'player' ? 'rotate-45 bg-green-500' : 'rotate-[225deg] bg-red-500'}
            `}  />
          )}
        </div>
        
        {/* Player's cards */}
        <div className="relative h-24 w-20">
          {flag.formation.player.cards.map((card, index) => (
            <div
              key={card.id}
              className="absolute w-full"
              style={{
                top: `${index * 24}px`,
                zIndex: index,
              }}
            >
              <Card card={card} condensed />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}