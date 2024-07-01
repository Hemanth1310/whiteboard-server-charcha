const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const activeRooms = {};
const disposedRooms = new Set();
const roomDrawings = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('createRoom', (roomId) => {
    if (!activeRooms[roomId] && !disposedRooms.has(roomId)) {
      activeRooms[roomId] = [];
      roomDrawings[roomId] = [];
      socket.join(roomId);
      activeRooms[roomId].push(socket.id);
      socket.emit('roomJoined', roomId);
      console.log(`User ${socket.id} created and joined room ${roomId}`);
    } else {
      console.log(`User ${socket.id} attempted to create an existing or disposed room ${roomId}`);
    }
  });

  socket.on('joinRoom', (roomId) => {
    if (disposedRooms.has(roomId)) {
      console.log(`User ${socket.id} attempted to access disposed room ${roomId}`);
      socket.emit('roomClosed', roomId);
    } else if (!activeRooms[roomId]) {
      console.log(`User ${socket.id} attempted to join non-existent room ${roomId}`);
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
    const { roomId, point } = data;

    if (!roomId || !point) {
      console.log(`Invalid drawing data received from user ${socket.id} in room ${roomId}:`, data);
      return;
    }

    if (activeRooms[roomId]) {
      if (point.x === -1 && point.y === -1) {
        roomDrawings[roomId].push({ x: -1, y: -1, color: point.color });
        io.to(roomId).emit('drawing', { x: -1, y: -1, color: point.color });
        console.log(`End of stroke received from user ${socket.id} in room ${roomId}`);
      } else {
        roomDrawings[roomId].push(point);
        io.to(roomId).emit('drawing', point);
        console.log(`Drawing event received from user ${socket.id} in room ${roomId}:`, point);
      }
    } else {
      console.log(`Drawing event received for non-existent room ${roomId} from user ${socket.id}`);
    }
  });

  socket.on('leaveRoom', (roomId) => {
    socket.leave(roomId);
    socket.disconnect();
    if (activeRooms[roomId]) {
      activeRooms[roomId] = activeRooms[roomId].filter(id => id !== socket.id);
      console.log(`User ${socket.id} left room ${roomId}`);
      if (activeRooms[roomId].length === 0) {
        delete activeRooms[roomId];
        disposedRooms.add(roomId);
        delete roomDrawings[roomId];
        console.log(`Room ${roomId} has been disposed of`);
        io.emit('roomDisposed', roomId);
      }
    }
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
          console.log(`Room ${roomId} has been disposed of`);
          io.emit('roomDisposed', roomId);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3005;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
