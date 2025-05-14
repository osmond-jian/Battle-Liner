import { Card } from './game';

export interface Move {
  player: 'player' | 'opponent';
  action: 'playCard' | 'useTactic';
  card: Card;
  flagIndex: number;
  tacticParams?: {
    config?: {
      color?: string;
      value?: number;
    };
  };
  drawnCard?: Card | null;
}
