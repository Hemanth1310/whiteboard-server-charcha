const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

// Initialize Express app
const app = express();
app.use(cors());

// Create HTTP server and bind it with Socket.IO
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
  },
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Listen for drawing events from clients
  socket.on('drawing', (data) => {
    // Broadcast drawing data to all connected clients except the sender
    socket.broadcast.emit('drawing', data);
  });

  // Listen for clear events from clients
  socket.on('clear', () => {
    // Broadcast clear event to all connected clients
    socket.broadcast.emit('clear');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Serve a simple message at the root URL
app.get('/', (req, res) => {
  res.send('Whiteboard server is running');
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
