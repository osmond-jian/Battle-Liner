import { useState } from 'react';

/**
 * Manages the three UI-only modals that are not driven by game state:
 * Rules, Formation Guide, and Deck Stats.
 */
export function useModalManager() {
  const [showRules, setShowRules] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showStats, setShowStats] = useState(false);
  // Persists which rules tab was last active so reopening remembers it.
  const [rulesTab, setRulesTab] = useState<'rules' | 'tactics'>('rules');

  return {
    showRules,
    showGuide,
    showStats,
    rulesTab,
    setRulesTab,
    openRules: () => setShowRules(true),
    openGuide: () => setShowGuide(true),
    openStats: () => setShowStats(true),
    closeRules: () => setShowRules(false),
    closeGuide: () => setShowGuide(false),
    closeStats: () => setShowStats(false),
  };
}
