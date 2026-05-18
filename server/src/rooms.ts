interface RoomEntry {
  code: string;
  hostSocketId: string;
  hostPlayerId: string;
  hostName: string;
  guestSocketId?: string;
  guestPlayerId?: string;
  guestName?: string;
  gameState?: unknown;
  isGuestTurn?: boolean;
  createdAt: number;
  lastActivity: number;
}

export class RoomManager {
  private rooms = new Map<string, RoomEntry>();
  // secondary index so disconnect handler can look up room in O(1)
  private socketToRoom = new Map<string, string>();

  upsertHost(
    code: string,
    host: { socketId: string; playerId: string; playerName: string; gameState?: unknown },
  ): { hadGuest: boolean } {
    const existing = this.rooms.get(code);
    if (existing) {
      this.socketToRoom.delete(existing.hostSocketId);
      existing.hostSocketId = host.socketId;
      existing.lastActivity = Date.now();
      if (host.gameState !== undefined) existing.gameState = host.gameState;
    } else {
      this.rooms.set(code, {
        code,
        hostSocketId: host.socketId,
        hostPlayerId: host.playerId,
        hostName: host.playerName,
        gameState: host.gameState,
        createdAt: Date.now(),
        lastActivity: Date.now(),
      });
    }
    this.socketToRoom.set(host.socketId, code);
    return { hadGuest: !!(existing?.guestSocketId) };
  }

  upsertGuest(
    code: string,
    guest: { socketId: string; playerId: string; playerName: string },
  ): boolean {
    const room = this.rooms.get(code);
    if (!room) return false;
    if (room.guestSocketId) this.socketToRoom.delete(room.guestSocketId);
    room.guestSocketId = guest.socketId;
    room.guestPlayerId = guest.playerId;
    room.guestName = guest.playerName;
    room.lastActivity = Date.now();
    this.socketToRoom.set(guest.socketId, code);
    return true;
  }

  get(code: string): RoomEntry | undefined {
    return this.rooms.get(code);
  }

  findBySocketId(socketId: string): string | undefined {
    return this.socketToRoom.get(socketId);
  }

  updateState(code: string, gameState: unknown, isGuestTurn?: boolean) {
    const room = this.rooms.get(code);
    if (!room) return;
    room.gameState = gameState;
    if (isGuestTurn !== undefined) room.isGuestTurn = isGuestTurn;
    room.lastActivity = Date.now();
  }

  markDisconnected(socketId: string) {
    const code = this.socketToRoom.get(socketId);
    if (!code) return;
    const room = this.rooms.get(code);
    if (room) room.lastActivity = Date.now();
    // Keep socketToRoom entry so reconnect can find the room (cleanup handles removal)
  }

  count(): number {
    return this.rooms.size;
  }

  startCleanup(onTick?: (removed: number) => void) {
    const INACTIVE_TTL = 30 * 60 * 1000; // 30 minutes
    setInterval(() => {
      const now = Date.now();
      let removed = 0;
      for (const [code, room] of this.rooms) {
        if (now - room.lastActivity > INACTIVE_TTL) {
          this.socketToRoom.delete(room.hostSocketId);
          if (room.guestSocketId) this.socketToRoom.delete(room.guestSocketId);
          this.rooms.delete(code);
          removed++;
        }
      }
      onTick?.(removed);
    }, 5 * 60 * 1000);
  }
}
