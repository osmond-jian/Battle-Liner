import type { Card } from '../types/game';

/** The canonical 10-card tactics deck. Order is intentional (t1–t10). */
export function createTacticsDeck(): Card[] {
  return [
    {
      id: 't1',
      type: 'tactic',
      name: 'Leader',
      effect: 'wild',
      color: undefined,
      value: 0,
    },
    {
      id: 't2',
      type: 'tactic',
      name: 'Leader',
      effect: 'wild',
      color: undefined,
      value: 0,
    },
    {
      id: 't3',
      type: 'tactic',
      name: 'Companion Cavalry',
      effect: 'value8',
      color: undefined,
      value: 8,
    },
    {
      id: 't4',
      type: 'tactic',
      name: 'Shield Bearers',
      effect: 'value≤3',
      color: undefined,
      value: 3,
    },
    {
      id: 't5',
      type: 'tactic',
      name: 'Fog',
      effect: 'fog',
      color: undefined,
      value: 0,
    },
    {
      id: 't6',
      type: 'tactic',
      name: 'Mud',
      effect: 'mud',
      color: undefined,
      value: 0,
    },
    {
      id: 't7',
      type: 'tactic',
      name: 'Scout',
      effect: 'scout',
      color: undefined,
      value: 0,
    },
    {
      id: 't8',
      type: 'tactic',
      name: 'Redeploy',
      effect: 'redeploy',
      color: undefined,
      value: 0,
    },
    {
      id: 't9',
      type: 'tactic',
      name: 'Deserter',
      effect: 'deserter',
      color: undefined,
      value: 0,
    },
    {
      id: 't10',
      type: 'tactic',
      name: 'Traitor',
      effect: 'traitor',
      color: undefined,
      value: 0,
    },
  ];
}
