// import React from 'react';
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
  return (
    <motion.div
      className="fixed z-50 pointer-events-none"
      initial={{ x: from.x, y: from.y, scale: 1 }}
      animate={{ x: to.x, y: to.y, scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      onAnimationComplete={onComplete}
    >
      <Card card={card} />
    </motion.div>
  );
}