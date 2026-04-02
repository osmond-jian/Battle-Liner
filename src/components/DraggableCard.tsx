import { useState, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Card as CardType } from '../types/game';
import { Card } from './Card';

interface DraggableCardProps {
  card: CardType;
  selected: boolean;
  onCardClick: () => void;
  onDropOnFlag: (card: CardType, flagIndex: number) => void;
  onDropOnCard: (fromId: string, toId: string) => void;
}

/**
 * Wraps a hand card with drag behaviour:
 *  - Drop on a flag  → play the card (instant position reset so the fly
 *    animation starts from the card's natural hand position, not the drag offset)
 *  - Drop on another hand card → swap positions
 *  - Drop elsewhere  → spring snap back to hand position
 */
export function DraggableCard({ card, selected, onCardClick, onDropOnFlag, onDropOnCard }: DraggableCardProps) {
  const controls   = useAnimation();
  const elRef      = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <motion.div
      ref={elRef}
      drag
      animate={controls}
      dragMomentum={false}
      dragElastic={0.08}
      whileDrag={{ scale: 1.08 }}
      className="touch-none select-none cursor-grab"
      style={{
        position: 'relative',
        zIndex: isDragging ? 100 : 'auto' as any,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(_, info) => {
        setIsDragging(false);

        // Temporarily remove from hit-testing so elementsFromPoint sees
        // what's underneath the dragged card.
        const el = elRef.current;
        if (el) el.style.pointerEvents = 'none';
        const hits = document.elementsFromPoint(info.point.x, info.point.y);
        if (el) el.style.pointerEvents = '';

        // ── 1. Dropped on a flag ──────────────────────────────────────────
        for (const target of hits) {
          const flagEl = (target as HTMLElement).closest?.('[data-flag-index]');
          if (flagEl) {
            const idx = parseInt(flagEl.getAttribute('data-flag-index') ?? '-1');
            if (idx >= 0) {
              // Instantly reset to origin BEFORE the fly animation queries the
              // card's bounding rect — otherwise the animation starts from the
              // drag offset position instead of the hand slot.
              controls.set({ x: 0, y: 0 });
              onDropOnFlag(card, idx);
              return;
            }
          }
        }

        // ── 2. Dropped on another hand card → swap ────────────────────────
        for (const target of hits) {
          const cardEl = (target as HTMLElement).closest?.('[id^="player-card-"]');
          if (cardEl) {
            const toId = (cardEl as HTMLElement).id.replace('player-card-', '');
            if (toId && toId !== card.id) {
              // Instant reset; the layout animation will slide cards into place.
              controls.set({ x: 0, y: 0 });
              onDropOnCard(card.id, toId);
              return;
            }
          }
        }

        // ── 3. No valid target → spring snap back ─────────────────────────
        controls.start({
          x: 0, y: 0,
          transition: { type: 'spring', stiffness: 500, damping: 38 },
        });
      }}
    >
      <Card
        id={`player-card-${card.id}`}
        card={card}
        onClick={onCardClick}
        selected={selected}
      />
    </motion.div>
  );
}
