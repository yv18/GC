const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "https://gc-o1wg.onrender.com",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: 'https://gc-o1wg.onrender.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

app.get("/", (req, res) => {
  res.send("Backend is working");
});

// In-memory chat message store
let messages = [];

// ✅ Track connected usernames
const connectedUsers = new Set();

io.on('connection', (socket) => {
  console.log('A user connected');

  // Send chat history
  socket.emit('chat history', messages);

  // ✅ Handle join event to store username
  socket.on('join', (username) => {
    socket.username = username; // store on socket
    connectedUsers.add(username);
    io.emit('user list', Array.from(connectedUsers));
    console.log(`✅ ${username} joined. Users online: ${connectedUsers.size}`);
  });

  // When a message is sent
  socket.on('chat message', (data) => {
    messages.push(data);
    io.emit('chat message', data);
  });

  // Typing indicators
  socket.on('typing', (data) => {
    socket.broadcast.emit('typing', data);
  });

  socket.on('stop typing', (sender) => {
    socket.broadcast.emit('stop typing', sender);
  });

  // ✅ Remove user when they disconnect
  socket.on('disconnect', () => {
    if (socket.username) {
      connectedUsers.delete(socket.username);
      io.emit('user list', Array.from(connectedUsers));
      console.log(`❌ ${socket.username} disconnected. Users online: ${connectedUsers.size}`);
    } else {
      console.log('User disconnected');
    }
  });
});

// ✅ Corrected: Use the HTTP server with socket.io
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Socket.io server running on http://localhost:${PORT}`);
});


