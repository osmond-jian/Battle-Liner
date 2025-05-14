import { motion } from 'framer-motion';
import { Card as CardType } from '../types/game';
import { Card } from './Card';

interface CardFlyProps {
  card: CardType;
  from: { x: number; y: number };
  to: { x: number; y: number };
  onComplete: () => void;
}

export function CardFly({ card, from, to, onComplete }: CardFlyProps) {
    console.log('Rendering CardFly', { from, to, card });
  return (
    <motion.div
      className="fixed z-50 pointer-events-none"
      initial={{ x: from.x, y: from.y }}
      animate={{ x: to.x, y: to.y }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      onAnimationComplete={onComplete}
      style={{
        width: '88px',        // or match your <Card /> size
        height: '140px',
        backgroundColor:'red',
      }}
    >
      <Card card={card} />
    </motion.div>
  );
}
