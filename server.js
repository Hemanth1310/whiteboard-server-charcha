const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const activeRooms = {};
const disposedRooms = new Set();
const roomDrawings = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('createRoom', (roomId) => {
    if (!activeRooms[roomId]) {
      activeRooms[roomId] = [];
      roomDrawings[roomId] = [];
    }
    socket.join(roomId);
    activeRooms[roomId].push(socket.id);
    socket.emit('roomJoined', roomId);
    console.log(`User ${socket.id} created and joined room ${roomId}`);
  });

  socket.on('joinRoom', (roomId) => {
    if (disposedRooms.has(roomId)) {
      socket.emit('roomClosed', roomId);

    } else if (!activeRooms[roomId]) {
      socket.emit('roomNotFound', roomId);

    } else {
      socket.join(roomId);
      activeRooms[roomId].push(socket.id);
      socket.emit('roomJoined', roomId);
      socket.emit('loadDrawing', roomDrawings[roomId]);
      console.log(`User ${socket.id} joined room ${roomId}`);
    }
  });

  socket.on('drawing', (data) => {
    const { roomId, x, y } = data;
    const point = { x, y };
    if (activeRooms[roomId]) {
      roomDrawings[roomId].push(point);
      io.to(roomId).emit('drawing', point);
    }
  })


  // Leave room
  socket.on('leaveRoom', (roomId) => {
    socket.leave(roomId);
    if (activeRooms[roomId]) {
      activeRooms[roomId] = activeRooms[roomId].filter(id => id !== socket.id);
      if (activeRooms[roomId].length === 0) {
        delete activeRooms[roomId];
        disposedRooms.add(roomId);
        delete roomDrawings[roomId];
        io.emit('roomDisposed', roomId);
      }
    }
    console.log(`User ${socket.id} left room ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.id} disconnected`);
    for (const roomId in activeRooms) {
      if (activeRooms[roomId].includes(socket.id)) {
        activeRooms[roomId] = activeRooms[roomId].filter(id => id !== socket.id);
        if (activeRooms[roomId].length === 0) {
          delete activeRooms[roomId];
          disposedRooms.add(roomId);
          delete roomDrawings[roomId];
          io.emit('roomDisposed', roomId);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3004;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
