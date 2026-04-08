import { describe, it, expect } from 'vitest';
import { generateRoomCode } from '../utils/roomCode';

const VALID_CHARS = new Set('ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
const AMBIGUOUS_CHARS = ['I', 'O', '0', '1'];

describe('generateRoomCode', () => {
  it('returns a 6-character string by default', () => {
    expect(generateRoomCode()).toHaveLength(6);
  });

  it('returns a string of the requested length', () => {
    expect(generateRoomCode(4)).toHaveLength(4);
    expect(generateRoomCode(8)).toHaveLength(8);
  });

  it('only contains valid uppercase characters', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      for (const ch of code) {
        expect(VALID_CHARS.has(ch), `unexpected char "${ch}" in code "${code}"`).toBe(true);
      }
    }
  });

  it('never contains visually ambiguous characters (I, O, 0, 1)', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      for (const ch of AMBIGUOUS_CHARS) {
        expect(code).not.toContain(ch);
      }
    }
  });

  it('produces unique codes across calls (probabilistic)', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateRoomCode()));
    // With 32^6 ≈ 1 billion possibilities, 20 calls should always be unique.
    expect(codes.size).toBe(20);
  });

  it('returns a string (not undefined or null)', () => {
    const code = generateRoomCode();
    expect(typeof code).toBe('string');
  });
});
