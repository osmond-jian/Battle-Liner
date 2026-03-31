import { useState } from 'react';

/**
 * Manages the three UI-only modals that are not driven by game state:
 * Rules, Formation Guide, and Deck Stats.
 */
export function useModalManager() {
  const [showRules, setShowRules] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showStats, setShowStats] = useState(false);

  return {
    showRules,
    showGuide,
    showStats,
    openRules: () => setShowRules(true),
    openGuide: () => setShowGuide(true),
    openStats: () => setShowStats(true),
    closeRules: () => setShowRules(false),
    closeGuide: () => setShowGuide(false),
    closeStats: () => setShowStats(false),
  };
}
