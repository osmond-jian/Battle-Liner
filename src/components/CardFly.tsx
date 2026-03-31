import { motion } from 'framer-motion';
import { Card as CardType } from '../types/game';
import { Card } from './Card';
import { CARD_WIDTH_PX, CARD_HEIGHT_PX } from '../constants';

interface CardFlyProps {
  card: CardType;
  from: { x: number; y: number };
  to: { x: number; y: number };
  onComplete: () => void;
}

export function CardFly({ card, from, to, onComplete }: CardFlyProps) {
  const motionKey = `${card.id}-${from.x.toFixed(0)}-${from.y.toFixed(0)}-${to.x.toFixed(0)}-${to.y.toFixed(0)}`;

  return (
    <motion.div
      key={motionKey}
      className="fixed pointer-events-none"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: `${CARD_WIDTH_PX}px`,
        height: `${CARD_HEIGHT_PX}px`,
        zIndex: 9999,
        transform: `translate(${from.x}px, ${from.y}px)`
      }}
      animate={{
        transform: `translate(${to.x}px, ${to.y}px)`
      }}
      transition={{
        duration: 0.5,
        ease: 'easeOut'
      }}
      onAnimationComplete={onComplete}
    >
      <Card card={card} id={`flying-${card.id}`} onClick={() => {}} selected={false} />
    </motion.div>
  );
}
