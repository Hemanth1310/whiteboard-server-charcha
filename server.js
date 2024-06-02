const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 10000;

// Store room data
const rooms = {};

// Handle socket connection
io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle joining a room
    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        if (!rooms[roomId]) {
            rooms[roomId] = [];
        }
        rooms[roomId].push(socket.id);
        console.log(`User ${socket.id} joined room ${roomId}`);
    });

    // Handle drawing
    socket.on('drawing', (data) => {
        const { roomId, point } = data;
        io.to(roomId).emit('drawing', { point });
        console.log(`Drawing event received from user ${socket.id} in room ${roomId}:`, point);
      });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`User ${socket.id} disconnected`);
        // Remove user from all rooms
        for (const roomId in rooms) {
            if (rooms[roomId].includes(socket.id)) {
                rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
                io.to(roomId).emit('userDisconnected', { userId: socket.id });
                console.log(`User ${socket.id} removed from room ${roomId}`);
            }
        }
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
