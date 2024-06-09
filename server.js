const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Store active rooms
const activeRooms = {};
// Store disposed rooms
const disposedRooms = new Set();
// Store drawing data for each room
const roomDrawings = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Join or create room
  socket.on('joinOrCreateRoom', (roomId) => {
    if (disposedRooms.has(roomId)) {
      // If room is disposed, notify the client
      console.log(`User ${socket.id} attempted to access disposed room ${roomId}`);
      socket.emit('roomClosed', roomId);
    } else {
      if (!activeRooms[roomId]) {
        // Create a new room
        activeRooms[roomId] = [];
        roomDrawings[roomId] = []; // Initialize drawing data for the room
      }
      socket.join(roomId);
      activeRooms[roomId].push(socket.id);
      socket.emit('roomJoined', roomId); // Emit roomJoined event here
      socket.emit('loadDrawing', roomDrawings[roomId]); // Send existing drawing data to the new user
      console.log(`User ${socket.id} joined room ${roomId}`);
    }
  });

  // Handle drawing
  socket.on('drawing', (data) => {
    const { roomId, x, y } = data;
    const point = { x, y };
    if (activeRooms[roomId]) {
      roomDrawings[roomId].push(point); // Store drawing data
      io.to(roomId).emit('drawing', point);
      console.log(`Drawing event received from user ${socket.id} in room ${roomId}:`, point);
    }
  });

  // WebRTC signaling
  socket.on('webrtc-offer', (data) => {
    const { roomId, type, sdp } = data;
    if (activeRooms[roomId]) {
      socket.to(roomId).emit('webrtc-offer', { type, sdp });
      console.log(`WebRTC offer from user ${socket.id} in room ${roomId}`);
    }
  });

  socket.on('webrtc-answer', (data) => {
    const { roomId, type, sdp } = data;
    if (activeRooms[roomId]) {
      socket.to(roomId).emit('webrtc-answer', { type, sdp });
      console.log(`WebRTC answer from user ${socket.id} in room ${roomId}`);
    }
  });

  socket.on('webrtc-candidate', (data) => {
    const { roomId, candidate, sdpMid, sdpMLineIndex } = data;
    if (activeRooms[roomId]) {
      socket.to(roomId).emit('webrtc-candidate', { candidate, sdpMid, sdpMLineIndex });
      console.log(`WebRTC candidate from user ${socket.id} in room ${roomId}`);
    }
  });

  // Leave room
  socket.on('leaveRoom', (roomId) => {
    socket.leave(roomId);
    if (activeRooms[roomId]) {
      activeRooms[roomId] = activeRooms[roomId].filter(id => id !== socket.id);
      console.log(`User ${socket.id} left room ${roomId}`);
      if (activeRooms[roomId].length === 0) {
        delete activeRooms[roomId]; // If no users in room, dispose it
        disposedRooms.add(roomId); // Add to disposed rooms list
        delete roomDrawings[roomId]; // Delete drawing data for the room
        console.log(`Room ${roomId} has been disposed of`);
        io.emit('roomDisposed', roomId);
      }
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User ${socket.id} disconnected`);
    // Remove user from all rooms
    for (const roomId in activeRooms) {
      if (activeRooms[roomId].includes(socket.id)) {
        activeRooms[roomId] = activeRooms[roomId].filter(id => id !== socket.id);
        if (activeRooms[roomId].length === 0) {
          delete activeRooms[roomId]; // If no users in room, dispose it
          disposedRooms.add(roomId); // Add to disposed rooms list
          delete roomDrawings[roomId]; // Delete drawing data for the room
          console.log(`Room ${roomId} has been disposed of`);
          io.emit('roomDisposed', roomId);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3004;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
