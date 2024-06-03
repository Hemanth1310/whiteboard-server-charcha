/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
const functions = require('firebase-functions');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const rooms = {};

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }
    rooms[roomId].push(socket.id);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('drawing', (data) => {
    const { roomId, x, y } = data;
    io.to(roomId).emit('drawing', { x, y });
    console.log(`Drawing event received from user ${socket.id} in room ${roomId}:`, { x, y });
  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.id} disconnected`);
    for (const roomId in rooms) {
      if (rooms[roomId].includes(socket.id)) {
        rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
        io.to(roomId).emit('userDisconnected', { userId: socket.id });
        console.log(`User ${socket.id} removed from room ${roomId}`);
      }
    }
  });
});

exports.app = functions.https.onRequest(app);
