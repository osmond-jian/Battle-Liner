import type { LocalPlayer } from '../types/multiplayer';

const KEY = 'battleline-profile';

const ADJECTIVES = ['Swift', 'Iron', 'Bold', 'Dark', 'Silver', 'Stone', 'Storm', 'Wild', 'Brave', 'Sharp'];
const NOUNS = ['Shield', 'Blade', 'Archer', 'Spear', 'Knight', 'Guard', 'Hawk', 'Wolf', 'Lance', 'Axe'];

function generateUsername(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${adj}${noun}${num}`;
}

export function getOrCreateProfile(): LocalPlayer {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    try {
      const p = JSON.parse(raw) as LocalPlayer;
      if (p.id && p.username) return p;
    } catch {
      // corrupt — fall through and regenerate
    }
  }
  const profile: LocalPlayer = {
    id: crypto.randomUUID(),
    username: generateUsername(),
  };
  localStorage.setItem(KEY, JSON.stringify(profile));
  return profile;
}

export function saveProfile(profile: LocalPlayer): void {
  localStorage.setItem(KEY, JSON.stringify(profile));
}
