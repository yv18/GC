const express  = require('express');
const http     = require('http');
const socketIo = require('socket.io');
const cors     = require('cors');

const app    = express();
const server = http.createServer(app);
const io     = socketIo(server, { cors: { origin: '*', methods: ['GET','POST'] } });

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.get('/', (_, res) => res.send('GroupChat API ✅'));

// ── State ────────────────────────────────────────────────────────────────────
const rooms = {
  general: { name: 'General', isPrivate: false, messages: [], users: new Map(), vibeBoard: [] }
};

function ensureRoom(roomId, name = roomId, isPrivate = false, password = null) {
  if (!rooms[roomId]) {
    rooms[roomId] = { name, isPrivate, password, messages: [], users: new Map(), vibeBoard: [] };
  }
  return rooms[roomId];
}

function getRoomUsers(roomId) {
  const room = rooms[roomId];
  if (!room) return [];
  return Array.from(room.users.values()).map(u => ({
    username: u.username, status: u.status, spectator: u.spectator
  }));
}

io.on('connection', (socket) => {
  socket.currentRoom = 'general';

  // ── Join / switch room ─────────────────────────────────────────────────────
  socket.on('join', ({ username, room = 'general', password, spectator = false }) => {
    const r = rooms[room];
    if (!r) { socket.emit('error', 'Room not found'); return; }
    if (r.isPrivate && r.password && r.password !== password) {
      socket.emit('error', 'Wrong room password'); return;
    }

    // Leave previous room
    if (socket.currentRoom && socket.currentRoom !== room) {
      const prev = rooms[socket.currentRoom];
      if (prev) { prev.users.delete(socket.id); io.to(socket.currentRoom).emit('user list', getRoomUsers(socket.currentRoom)); }
      socket.leave(socket.currentRoom);
    }

    socket.username  = username;
    socket.spectator = spectator;
    socket.currentRoom = room;
    socket.join(room);

    rooms[room].users.set(socket.id, { username, status: 'online', spectator });

    socket.emit('room joined', { room, name: r.name, isPrivate: r.isPrivate, spectator });
    socket.emit('chat history', rooms[room].messages.slice(-100));
    socket.emit('vibe board', rooms[room].vibeBoard);
    io.to(room).emit('user list', getRoomUsers(room));
  });

  // ── Create private room ───────────────────────────────────────────────────
  socket.on('create room', ({ name, password, username }) => {
    const roomId = Math.random().toString(36).slice(2, 8).toUpperCase();
    ensureRoom(roomId, name, true, password);
    socket.emit('room created', { roomId, name });
  });

  // ── List public rooms ─────────────────────────────────────────────────────
  socket.on('list rooms', () => {
    const list = Object.entries(rooms)
      .filter(([, r]) => !r.isPrivate)
      .map(([id, r]) => ({ id, name: r.name, count: r.users.size }));
    socket.emit('room list', list);
  });

  // ── Chat message ──────────────────────────────────────────────────────────
  socket.on('chat message', (data) => {
    const room = rooms[socket.currentRoom];
    if (!room) return;
    const msg = { ...data, id: data.id || `m${Date.now()}`, reactions: data.reactions || {}, room: socket.currentRoom };
    room.messages.push(msg);
    if (room.messages.length > 300) room.messages = room.messages.slice(-300);
    io.to(socket.currentRoom).emit('chat message', msg);
  });

  // ── Reaction (fixed: server toggles & broadcasts full reaction map) ───────
  socket.on('reaction', ({ msgId, emoji, user }) => {
    const room = rooms[socket.currentRoom];
    if (!room) return;
    const msg = room.messages.find(m => m.id === msgId);
    if (msg) {
      if (!msg.reactions) msg.reactions = {};
      if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
      const idx = msg.reactions[emoji].indexOf(user);
      if (idx === -1) msg.reactions[emoji].push(user);
      else msg.reactions[emoji].splice(idx, 1);
      // Broadcast the FULL updated reactions object so all clients stay in sync
      io.to(socket.currentRoom).emit('reaction update', { msgId, reactions: msg.reactions });
    }
  });

  // ── Status update ─────────────────────────────────────────────────────────
  socket.on('status', ({ status }) => {
    const room = rooms[socket.currentRoom];
    if (room && room.users.has(socket.id)) {
      room.users.get(socket.id).status = status;
      io.to(socket.currentRoom).emit('user list', getRoomUsers(socket.currentRoom));
    }
  });

  // ── Vibe board ────────────────────────────────────────────────────────────
  socket.on('vibe drop', ({ url, sender }) => {
    const room = rooms[socket.currentRoom];
    if (!room) return;
    const entry = { url, sender, id: Date.now() };
    room.vibeBoard.unshift(entry);
    if (room.vibeBoard.length > 20) room.vibeBoard = room.vibeBoard.slice(0, 20);
    io.to(socket.currentRoom).emit('vibe board', room.vibeBoard);
  });

  // ── Cinematic moment trigger (server validates 5+ reactions in 10s) ───────
  socket.on('cinematic check', ({ msgId }) => {
    io.to(socket.currentRoom).emit('cinematic moment', { msgId });
  });

  // ── Typing ────────────────────────────────────────────────────────────────
  socket.on('typing',      (d) => socket.to(socket.currentRoom).emit('typing', d));
  socket.on('stop typing', (d) => socket.to(socket.currentRoom).emit('stop typing', d));

  // ── Translate request (client handles via API, server just relays) ────────
  socket.on('translate', (data) => socket.emit('translate result', data));

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const room = rooms[socket.currentRoom];
    if (room) {
      room.users.delete(socket.id);
      io.to(socket.currentRoom).emit('user list', getRoomUsers(socket.currentRoom));
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
