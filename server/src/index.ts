import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { RoomManager } from './rooms';
import path from 'path';

// ── Logger ───────────────────────────────────────────────────────────────────

const log = {
  info:  (...a: unknown[]) => console.log( `[${new Date().toISOString()}] INFO `, ...a),
  warn:  (...a: unknown[]) => console.warn(`[${new Date().toISOString()}] WARN `, ...a),
  error: (...a: unknown[]) => console.error(`[${new Date().toISOString()}] ERROR`, ...a),
};

// ── Config ───────────────────────────────────────────────────────────────────

const CORS_ORIGIN: string | true = process.env.CORS_ORIGIN ?? true;
const PORT = Number(process.env.PORT) || 3001;
const MAX_GAMESTATE_BYTES = 256 * 1024; // 256 KB

// ── Validation ────────────────────────────────────────────────────────────────

interface RegisterData {
  roomCode: string;
  playerId: string;
  playerName: string;
  isHost: boolean;
  gameState?: unknown;
}

function validateRegister(data: unknown): { ok: true; data: RegisterData } | { ok: false; error: string } {
  if (!data || typeof data !== 'object') return { ok: false, error: 'Invalid payload.' };
  const d = data as Record<string, unknown>;

  if (typeof d.roomCode !== 'string' || !/^[A-Z0-9]{6}$/.test(d.roomCode))
    return { ok: false, error: 'roomCode must be exactly 6 uppercase alphanumeric characters.' };
  if (typeof d.playerId !== 'string' || d.playerId.length === 0 || d.playerId.length > 64)
    return { ok: false, error: 'playerId must be a non-empty string (max 64 chars).' };
  if (typeof d.playerName !== 'string' || d.playerName.trim().length === 0 || d.playerName.length > 20)
    return { ok: false, error: 'playerName must be 1–20 characters.' };
  if (typeof d.isHost !== 'boolean')
    return { ok: false, error: 'isHost must be a boolean.' };

  return { ok: true, data: d as unknown as RegisterData };
}

function checkSize(roomCode: string, gameState: unknown): boolean {
  try {
    const bytes = Buffer.byteLength(JSON.stringify(gameState), 'utf8');
    if (bytes > MAX_GAMESTATE_BYTES) {
      log.warn(`gameState too large room=${roomCode} bytes=${bytes}`);
      return false;
    }
  } catch {
    log.warn(`gameState not serialisable room=${roomCode}`);
    return false;
  }
  return true;
}

// ── Server setup ──────────────────────────────────────────────────────────────

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));

const httpServer = createServer(app);
const rooms = new RoomManager();
rooms.startCleanup((removed) => {
  if (removed > 0) log.info(`cleanup removed ${removed} room(s)`);
});

const io = new Server(httpServer, {
  cors: { origin: CORS_ORIGIN },
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: rooms.count() });
});

// Serve built frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ── Types ────────────────────────────────────────────────────────────────────

type RegisterResponse =
  | { status: 'ok'; role: 'host'; guestPresent: boolean }
  | { status: 'ok'; role: 'guest' }
  | { status: 'error'; message: string };

// ── Connection handler ───────────────────────────────────────────────────────

io.on('connection', (socket: Socket) => {

  socket.on('register', (data: unknown, callback: (res: RegisterResponse) => void) => {
    const result = validateRegister(data);
    if (!result.ok) {
      log.warn(`register rejected socket=${socket.id}: ${result.error}`);
      callback({ status: 'error', message: result.error });
      return;
    }

    const { roomCode, playerId, playerName, isHost, gameState } = result.data;

    if (isHost) {
      const { hadGuest } = rooms.upsertHost(roomCode, { socketId: socket.id, playerId, playerName, gameState });
      socket.join(roomCode);
      log.info(`register host room=${roomCode} player=${playerName}`);
      callback({ status: 'ok', role: 'host', guestPresent: hadGuest });

      const room = rooms.get(roomCode);
      if (room?.guestSocketId) {
        io.to(room.guestSocketId).emit('opponent_reconnected');
      }
      return;
    }

    // Guest joining or rejoining.
    const room = rooms.get(roomCode);
    if (!room) {
      callback({ status: 'error', message: 'Room not found. Host may still be reconnecting.' });
      return;
    }

    const isRejoin = room.guestPlayerId === playerId;

    if (!isRejoin && room.guestSocketId) {
      callback({ status: 'error', message: 'Room is full.' });
      return;
    }

    rooms.upsertGuest(roomCode, { socketId: socket.id, playerId, playerName });
    socket.join(roomCode);
    log.info(`register guest room=${roomCode} player=${playerName} rejoin=${isRejoin}`);
    callback({ status: 'ok', role: 'guest' });

    if (room.hostSocketId) {
      const event = isRejoin ? 'opponent_reconnected' : 'guest_joined';
      io.to(room.hostSocketId).emit(event, { guestName: playerName });
    }
  });

  socket.on('game_state', ({ roomCode, gameState }: { roomCode: string; gameState: unknown }) => {
    if (!checkSize(roomCode, gameState)) return;
    rooms.updateState(roomCode, gameState);
    socket.to(roomCode).emit('game_state', { gameState });
  });

  socket.on('init_state', ({ roomCode, gameState, guestGoesFirst }: { roomCode: string; gameState: unknown; guestGoesFirst: boolean }) => {
    if (!checkSize(roomCode, gameState)) return;
    rooms.updateState(roomCode, gameState);
    socket.to(roomCode).emit('init_state', { gameState, guestGoesFirst });
  });

  socket.on('resync_state', ({ roomCode, gameState, isGuestTurn }: { roomCode: string; gameState: unknown; isGuestTurn: boolean }) => {
    if (!checkSize(roomCode, gameState)) return;
    rooms.updateState(roomCode, gameState, isGuestTurn);
    socket.to(roomCode).emit('resync_state', { gameState, isGuestTurn });
  });

  socket.on('concede', ({ roomCode }: { roomCode: string }) => {
    log.info(`concede room=${roomCode}`);
    socket.to(roomCode).emit('concede');
  });

  socket.on('rematch_request', ({ roomCode }: { roomCode: string }) => {
    log.info(`rematch_request room=${roomCode}`);
    socket.to(roomCode).emit('rematch_request');
  });

  socket.on('rematch_accept', ({ roomCode }: { roomCode: string }) => {
    log.info(`rematch_accept room=${roomCode}`);
    socket.to(roomCode).emit('rematch_accept');
  });

  socket.on('disconnect', () => {
    const roomCode = rooms.findBySocketId(socket.id);
    if (roomCode) {
      log.info(`disconnect socket=${socket.id} room=${roomCode}`);
      io.to(roomCode).except(socket.id).emit('opponent_disconnected');
      rooms.markDisconnected(socket.id);
    }
  });
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────

function shutdown() {
  log.info('shutdown signal received, closing server');
  io.emit('server_shutdown');
  io.close();
  httpServer.close(() => process.exit(0));
  // Hard exit if connections don't drain within 8 seconds.
  setTimeout(() => process.exit(1), 8000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);

// ── Start ─────────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  log.info(`listening on port ${PORT} cors=${CORS_ORIGIN}`);
});
