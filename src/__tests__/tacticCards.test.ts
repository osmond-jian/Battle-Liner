import { describe, it, expect } from 'vitest';
import { createTacticsDeck } from '../data/tacticCards';

describe('createTacticsDeck', () => {
  it('returns exactly 10 cards', () => {
    expect(createTacticsDeck()).toHaveLength(10);
  });

  it('assigns type "tactic" to every card', () => {
    createTacticsDeck().forEach(c => expect(c.type).toBe('tactic'));
  });

  it('assigns ids t1 through t10 in order', () => {
    const deck = createTacticsDeck();
    deck.forEach((c, i) => expect(c.id).toBe(`t${i + 1}`));
  });

  it('returns a new array on each call (not a cached reference)', () => {
    expect(createTacticsDeck()).not.toBe(createTacticsDeck());
  });

  it('contains the expected card names', () => {
    const deck = createTacticsDeck();
    const names = deck.map(c => c.name);
    expect(names).toContain('Leader');
    expect(names).toContain('Companion Cavalry');
    expect(names).toContain('Shield Bearers');
    expect(names).toContain('Fog');
    expect(names).toContain('Mud');
    expect(names).toContain('Scout');
    expect(names).toContain('Redeploy');
    expect(names).toContain('Deserter');
    expect(names).toContain('Traitor');
  });

  it('has two Leader cards (t1 and t2)', () => {
    const deck = createTacticsDeck();
    const leaders = deck.filter(c => c.name === 'Leader');
    expect(leaders).toHaveLength(2);
    expect(leaders[0].id).toBe('t1');
    expect(leaders[1].id).toBe('t2');
  });

  it('Companion Cavalry has value 8', () => {
    const deck = createTacticsDeck();
    const companion = deck.find(c => c.name === 'Companion Cavalry');
    expect(companion?.value).toBe(8);
  });

  it('Shield Bearers has value 3', () => {
    const deck = createTacticsDeck();
    const shield = deck.find(c => c.name === 'Shield Bearers');
    expect(shield?.value).toBe(3);
  });

  it('modifier cards (Fog, Mud) have value 0', () => {
    const deck = createTacticsDeck();
    ['Fog', 'Mud'].forEach(name => {
      const card = deck.find(c => c.name === name);
      expect(card?.value).toBe(0);
    });
  });
});
