import type { CardColor, CardValue } from './types/game';

export const CARD_COLORS: CardColor[] = ['red', 'blue', 'green', 'orange', 'purple', 'yellow'];
export const CARD_VALUES: CardValue[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const CARD_WIDTH_PX = 80;
export const CARD_HEIGHT_PX = 112;

/**
 * Set to `true` to disable the "player can't play more than 1 tactic ahead
 * of the opponent" rule.  Useful during development / debugging.
 */
export const DEBUG_DISABLE_TACTICS_LIMIT = false;
