import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModalManager } from '../hooks/useModalManager';

// ── Initial state ─────────────────────────────────────────────────────────────

describe('useModalManager — initial state', () => {
  it('all modals start closed', () => {
    const { result } = renderHook(() => useModalManager());
    expect(result.current.showRules).toBe(false);
    expect(result.current.showGuide).toBe(false);
    expect(result.current.showStats).toBe(false);
  });

  it('rules tab starts on "rules"', () => {
    const { result } = renderHook(() => useModalManager());
    expect(result.current.rulesTab).toBe('rules');
  });

  it('guide tab starts on "formations"', () => {
    const { result } = renderHook(() => useModalManager());
    expect(result.current.guideTab).toBe('formations');
  });
});

// ── Open / close ──────────────────────────────────────────────────────────────

describe('useModalManager — open / close', () => {
  it('openRules / closeRules toggle showRules', () => {
    const { result } = renderHook(() => useModalManager());
    act(() => result.current.openRules());
    expect(result.current.showRules).toBe(true);
    act(() => result.current.closeRules());
    expect(result.current.showRules).toBe(false);
  });

  it('openGuide / closeGuide toggle showGuide', () => {
    const { result } = renderHook(() => useModalManager());
    act(() => result.current.openGuide());
    expect(result.current.showGuide).toBe(true);
    act(() => result.current.closeGuide());
    expect(result.current.showGuide).toBe(false);
  });

  it('openStats / closeStats toggle showStats', () => {
    const { result } = renderHook(() => useModalManager());
    act(() => result.current.openStats());
    expect(result.current.showStats).toBe(true);
    act(() => result.current.closeStats());
    expect(result.current.showStats).toBe(false);
  });
});

// ── Rules tab persistence ─────────────────────────────────────────────────────
//
// Regression test for: RulesPopup tab was not remembered across open/close cycles.
// The tab state must live in useModalManager, not inside the RulesPopup component.

describe('useModalManager — rules tab persistence', () => {
  it('rulesTab survives a close→reopen cycle', () => {
    const { result } = renderHook(() => useModalManager());

    act(() => result.current.openRules());
    act(() => result.current.setRulesTab('tactics'));
    expect(result.current.rulesTab).toBe('tactics');

    // Close and reopen — tab must still be 'tactics'
    act(() => result.current.closeRules());
    act(() => result.current.openRules());
    expect(result.current.rulesTab).toBe('tactics');
  });

  it('rulesTab survives multiple open/close cycles', () => {
    const { result } = renderHook(() => useModalManager());

    act(() => result.current.openRules());
    act(() => result.current.setRulesTab('tactics'));
    act(() => result.current.closeRules());

    act(() => result.current.openRules());
    act(() => result.current.setRulesTab('rules'));
    act(() => result.current.closeRules());

    act(() => result.current.openRules());
    expect(result.current.rulesTab).toBe('rules');
  });
});

// ── Reference guide tab persistence ──────────────────────────────────────────
//
// Regression test for: FormationGuide tab was not remembered across open/close
// cycles because the tab lived in local component state instead of useModalManager.

describe('useModalManager — guide tab persistence', () => {
  it('guideTab survives a close→reopen cycle', () => {
    const { result } = renderHook(() => useModalManager());

    act(() => result.current.openGuide());
    act(() => result.current.setGuideTab('tactics'));
    expect(result.current.guideTab).toBe('tactics');

    // Close and reopen — tab must still be 'tactics'
    act(() => result.current.closeGuide());
    act(() => result.current.openGuide());
    expect(result.current.guideTab).toBe('tactics');
  });

  it('guideTab survives multiple open/close cycles', () => {
    const { result } = renderHook(() => useModalManager());

    act(() => result.current.openGuide());
    act(() => result.current.setGuideTab('tactics'));
    act(() => result.current.closeGuide());

    act(() => result.current.openGuide());
    act(() => result.current.setGuideTab('formations'));
    act(() => result.current.closeGuide());

    act(() => result.current.openGuide());
    expect(result.current.guideTab).toBe('formations');
  });

  it('switching between rules and guide modals does not reset either tab', () => {
    const { result } = renderHook(() => useModalManager());

    act(() => result.current.openRules());
    act(() => result.current.setRulesTab('tactics'));
    act(() => result.current.closeRules());

    act(() => result.current.openGuide());
    act(() => result.current.setGuideTab('tactics'));
    act(() => result.current.closeGuide());

    // Both tabs should still be 'tactics'
    expect(result.current.rulesTab).toBe('tactics');
    expect(result.current.guideTab).toBe('tactics');
  });
});
