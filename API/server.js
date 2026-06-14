const express   = require('express');
const http      = require('http');
const socketIo  = require('socket.io');
const cors      = require('cors');

const app    = express();
const server = http.createServer(app);
const io     = socketIo(server, {
  cors: { origin: '*', methods: ['GET','POST'] }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.get('/', (_, res) => res.send('GroupChat backend running ✅'));

let messages = [];
const connectedUsers = new Set();

io.on('connection', (socket) => {
  console.log('User connected');

  // Send history
  socket.emit('chat history', messages);

  // Join with username
  socket.on('join', (username) => {
    socket.username = username;
    connectedUsers.add(username);
    io.emit('user list', Array.from(connectedUsers));
    console.log(`✅ ${username} joined (${connectedUsers.size} online)`);
  });

  // New message — store with id and reactions
  socket.on('chat message', (data) => {
    const msg = { ...data, reactions: data.reactions || {} };
    messages.push(msg);
    // Keep last 200 messages only
    if (messages.length > 200) messages = messages.slice(-200);
    io.emit('chat message', msg);
  });

  // Reaction toggle
  socket.on('reaction', ({ msgId, emoji, user }) => {
    const msg = messages.find(m => m.id === msgId);
    if (msg) {
      if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
      const idx = msg.reactions[emoji].indexOf(user);
      if (idx === -1) msg.reactions[emoji].push(user);
      else msg.reactions[emoji].splice(idx, 1);
    }
    // Broadcast to everyone including sender
    io.emit('reaction', { msgId, emoji, user });
  });

  // Typing
  socket.on('typing',      (data)   => socket.broadcast.emit('typing', data));
  socket.on('stop typing', (sender) => socket.broadcast.emit('stop typing', sender));
  socket.on('read',        (data)   => socket.broadcast.emit('read', data));

  // Disconnect
  socket.on('disconnect', () => {
    if (socket.username) {
      connectedUsers.delete(socket.username);
      io.emit('user list', Array.from(connectedUsers));
      console.log(`❌ ${socket.username} left (${connectedUsers.size} online)`);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
