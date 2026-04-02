/**
 * Multiplayer service — Phase 3 will replace these stubs with a real backend.
 *
 * Recommended options for Phase 3:
 *   A) Firebase Realtime DB  — set(ref(db, `rooms/${code}`), data)  /  onValue(ref(db, `rooms/${code}`), cb)
 *   B) Supabase Realtime     — supabase.from('rooms').insert(...)  /  supabase.channel('rooms').on('postgres_changes', ...)
 *   C) PartyKit              — new PartySocket({ host, room: code })  /  socket.onmessage
 *   D) Socket.io + Express   — socket.emit('createRoom', ...) / socket.on('roomUpdated', ...)
 *
 * All four options fit naturally into the shape below.
 */

export interface RoomData {
  code: string;
  hostId: string;
  hostName: string;
  guestId?: string;
  guestName?: string;
  status: 'waiting' | 'ready' | 'in_game';
}

export function generateRoomCode(): string {
  const words = ['ALPHA', 'BRAVO', 'DELTA', 'EAGLE', 'FORCE', 'GHOST', 'HONOR', 'IRON'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${word}-${num}`;
}

// ── Stubs ─────────────────────────────────────────────────────────────────
// Replace each function body with a real network call in Phase 3.

export async function createRoom(
  _hostId: string,
  _hostName: string,
  _code: string,
): Promise<void> {
  // Phase 3 (Firebase):  await set(ref(db, `rooms/${_code}`), { hostId: _hostId, hostName: _hostName, status: 'waiting' });
  // Phase 3 (Supabase):  await supabase.from('rooms').insert({ code: _code, host_id: _hostId, host_name: _hostName });
  await delay(300);
}

export async function joinRoom(
  _code: string,
  _guestId: string,
  _guestName: string,
): Promise<RoomData> {
  // Phase 3 (Firebase):
  //   const snap = await get(ref(db, `rooms/${_code}`));
  //   if (!snap.exists()) throw new Error('Room not found');
  //   await update(ref(db, `rooms/${_code}`), { guestId: _guestId, guestName: _guestName, status: 'ready' });
  //   return snap.val() as RoomData;
  await delay(400);
  throw new Error('Multiplayer server not connected yet — Phase 3 coming soon!');
}

/**
 * Subscribe to live room updates. Returns an unsubscribe function.
 *
 * Phase 3 (Firebase):
 *   const unsub = onValue(ref(db, `rooms/${code}`), snap => onUpdate(snap.val()));
 *   return () => unsub();
 *
 * Phase 3 (Supabase):
 *   const channel = supabase.channel(`room-${code}`)
 *     .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` },
 *         payload => onUpdate(payload.new as RoomData))
 *     .subscribe();
 *   return () => supabase.removeChannel(channel);
 */
export function subscribeToRoom(
  _code: string,
  _onUpdate: (room: RoomData) => void,
): () => void {
  return () => {};
}

export async function startGame(_code: string): Promise<void> {
  // Phase 3: await update(ref(db, `rooms/${_code}`), { status: 'in_game' });
  await delay(200);
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
