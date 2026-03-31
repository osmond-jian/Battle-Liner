import { useState, useCallback, useRef } from 'react';
import type { Card as CardType } from '../types/game';
import { CARD_WIDTH_PX, CARD_HEIGHT_PX } from '../constants';

export type ActionToAnimate =
  | { type: 'DRAW_CARD'; deckType: 'troop' | 'tactic'; player: 'player' | 'opponent'; card: CardType }
  | { type: 'PLAY_CARD'; card: CardType; flagIndex: number; player: 'player' | 'opponent' }
  | { type: 'APPLY_TACTIC'; card: CardType; flagIndex: number; player: 'player' | 'opponent' };

export interface AnimationState {
  flyingCard: CardType | null;
  flyFrom: { x: number; y: number };
  flyTo: { x: number; y: number };
  animatingAction: 'PLAY_CARD' | 'DRAW_CARD' | null;
}

/**
 * Returns the screen position where the next drawn card will land in the hand.
 *
 * For DRAW_CARD, we target just after the current last card so the fly animation
 * lands exactly where the card will appear. After dispatch, Framer Motion's
 * `layout` prop on each hand card animates the whole row to its newly centered
 * positions.
 */
function computeDrawTarget(
  player: 'player' | 'opponent',
): { x: number; y: number } | null {
  const handId     = player === 'player' ? 'hand' : 'opponent-hand';
  const cardPrefix = player === 'player' ? 'player-card-' : 'opponent-card-';

  const handEl = document.getElementById(handId);
  if (!handEl) return null;

  const handRect     = handEl.getBoundingClientRect();
  const existingCards = Array.from(
    handEl.querySelectorAll(`[id^="${cardPrefix}"]`),
  ) as HTMLElement[];

  // No cards yet — center of the hand container
  if (existingCards.length === 0) {
    return {
      x: handRect.left + handRect.width  / 2 - CARD_WIDTH_PX  / 2,
      y: handRect.top  + handRect.height / 2 - CARD_HEIGHT_PX / 2,
    };
  }

  const lastCard = existingCards[existingCards.length - 1];
  const lastRect = lastCard.getBoundingClientRect();
  const GAP = 6; // gap-1.5 = 6 px
  const nextX = lastRect.right + GAP;

  // Fits on the same row
  if (nextX + CARD_WIDTH_PX <= handRect.right + 16) {
    return { x: nextX, y: lastRect.top };
  }

  // Would overflow — estimate next row
  return {
    x: handRect.left,
    y: lastRect.bottom + GAP,
  };
}

export function useAnimations() {
  const [flyingCard, setFlyingCard]       = useState<CardType | null>(null);
  const [flyFrom, setFlyFrom]             = useState({ x: 0, y: 0 });
  const [flyTo,   setFlyTo]               = useState({ x: 0, y: 0 });
  const [animatingAction, setAnimatingAction] =
    useState<'PLAY_CARD' | 'DRAW_CARD' | null>(null);

  const onDoneRef = useRef<(() => void) | null>(null);

  const animate = useCallback((action: ActionToAnimate, onComplete: () => void) => {
    requestAnimationFrame(() => {
      if (action.type === 'PLAY_CARD' || action.type === 'APPLY_TACTIC') {
        const fromEl = document.getElementById(`${action.player}-card-${action.card.id}`);
        const toEl   = document.getElementById(`flag-${action.flagIndex}-${action.player}`);

        if (!fromEl || !toEl) { onComplete(); return; }

        const fromRect = fromEl.getBoundingClientRect();
        const toRect   = toEl.getBoundingClientRect();

        setFlyFrom({ x: fromRect.left, y: fromRect.top });
        setFlyTo({   x: toRect.left,   y: toRect.top   });

      } else {
        // DRAW_CARD — fly from the deck to where the card will land in the hand.
        // The dispatch happens in onComplete (after the animation), so the card is
        // never in the DOM until the fly finishes — no flash.
        const fromEl = document.getElementById(`deck-${action.deckType}`);
        if (!fromEl) { onComplete(); return; }

        const target = computeDrawTarget(action.player);
        if (!target) { onComplete(); return; }

        const fromRect = fromEl.getBoundingClientRect();
        setFlyFrom({ x: fromRect.left, y: fromRect.top });
        setFlyTo(target);
      }

      setFlyingCard(action.card);
      onDoneRef.current = () => {
        setFlyingCard(null);
        onComplete();
      };
    });
  }, []);

  const handleFlyComplete = useCallback(() => {
    onDoneRef.current?.();
    onDoneRef.current = null;
  }, []);

  const resetAnimations = useCallback(() => {
    setFlyingCard(null);
    setAnimatingAction(null);
    onDoneRef.current = null;
  }, []);

  return {
    flyingCard,
    flyFrom,
    flyTo,
    animatingAction,
    setAnimatingAction,
    animate,
    handleFlyComplete,
    resetAnimations,
  };
}
