const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const app = express();
const cors = require('cors');

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

app.get("/", (req, res) => {
  res.send("Backend is working");
});

// In-memory chat message store
let messages = [];

io.on('connection', (socket) => {
  console.log('A user connected');

  // Send chat history to the newly connected client
  socket.emit('chat history', messages);

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

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// ✅ Corrected: Use the HTTP server with socket.io
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Socket.io server running on http://localhost:${PORT}`);
});
