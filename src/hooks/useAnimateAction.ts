import React, { useCallback } from 'react';
import type { Card as CardType } from '../types/game';
import type { FullGameState } from '../types/FullGameState';

export type ActionToAnimate =
  | {
      type: 'DRAW_CARD';
      deckType: 'troop' | 'tactic';
      player: 'player' | 'opponent';
    }
  | {
      type: 'PLAY_CARD';
      card: CardType;
      flagIndex: number;
      player: 'player' | 'opponent';
    }
  | {
      type: 'APPLY_TACTIC';
      card: CardType;
      flagIndex: number;
      player: 'player' | 'opponent';
    };


/**
 * Encapsulates the animateAction implementation.
 */
export function useAnimateAction(
  gameStateRef: React.MutableRefObject<FullGameState>,
  setFlyFrom:     React.Dispatch<React.SetStateAction<{ x: number; y: number }>>,
  setFlyTo:       React.Dispatch<React.SetStateAction<{ x: number; y: number }>>,
  setFlyingCard:  React.Dispatch<React.SetStateAction<CardType | null>>,
  setOnAnimationDone: React.Dispatch<React.SetStateAction<(() => void) | null>>
) {
  return useCallback((action: ActionToAnimate, onComplete: () => void) => {
    requestAnimationFrame(() => {
      let fromEl: HTMLElement | null = null;
      let toEl:   HTMLElement | null = null;
      let card:   CardType;

    if (action.type === 'PLAY_CARD' || action.type === 'APPLY_TACTIC') {
        // Always fly from the exact card element, whether it's the player’s or opponent’s card
        const sourceId = `${action.player}-card-${action.card.id}`;
        const flagId   = `flag-${action.flagIndex}`;
        const slotId = `flag-${action.flagIndex}-${action.player}`;

        fromEl = document.getElementById(sourceId);
        toEl   = document.getElementById(slotId);
        card   = action.card;

      } else {
        // ——— Draw-card animation
        // 1) source = deck
        const deckId = `deck-${action.deckType}`;
        fromEl = document.getElementById(deckId);

        // 2) figure out which card just landed in the hand
        const handArr = action.player === 'player'
          ? gameStateRef.current.playerHand
          : gameStateRef.current.opponentHand;
        card = handArr[handArr.length - 1];

        // 3) target = that card’s own element
        const cardId = `${action.player}-card-${card.id}`;
        toEl = document.getElementById(cardId);
        console.log('DRAW from:', deckId, fromEl, 'to:', cardId, toEl);
      }

      if (!fromEl || !toEl) {
        console.error('Couldn’t find elements to animate', action, { fromEl, toEl });
        onComplete();
        return;
      }

      const fromRect = fromEl.getBoundingClientRect();
      const toRect   = toEl.getBoundingClientRect();

      setFlyFrom({ x: fromRect.left, y: fromRect.top });
      setFlyTo({   x: toRect.left,   y: toRect.top   });
      setFlyingCard(card);

      setOnAnimationDone(() => () => {
        setFlyingCard(null);
        onComplete();
      });
    });
  }, [
    gameStateRef,
    setFlyFrom,
    setFlyTo,
    setFlyingCard,
    setOnAnimationDone
  ]);
}
