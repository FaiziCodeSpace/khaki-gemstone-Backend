// backend/server.js
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

import app from "./app.js";

dotenv.config();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // your frontend
    methods: ["GET", "POST"],
  },
});

// ===== Socket.IO Security Middleware =====
io.use((socket, next) => {
  const token = socket.handshake.auth.token; // JWT sent from frontend
  if (!token) return next(new Error("Authentication error"));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.admin = decoded; // attach admin info to socket
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

// ===== Socket.IO Connection & City Rooms =====
io.on("connection", (socket) => {
  console.log(`Admin connected: ${socket.admin.id}, city: ${socket.admin.city}`);

  // Join city room
  socket.join(socket.admin.city);

  // Example: broadcast new order to admins in the same city
  socket.on("send-order-update", (data) => {
    io.to(socket.admin.city).emit("new-order", data);
  });

  socket.on("disconnect", () => {
    console.log(`Admin disconnected: ${socket.admin.id}`);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
