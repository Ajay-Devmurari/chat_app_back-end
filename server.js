const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

// ✅ FIX: Removed .default (it causes crash on deployment)
const setupSocket = require("./socketHandler");

require("dotenv").config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e8, // ✅ FIX: 100MB limit (1e6 = 1MB, 1e8 = 100MB) for Base64 Images
});

app.use(cors());
app.use(express.json());

// Health Check
app.get("/", (req, res) => {
  const onlineCount = Object.keys(io.sockets.sockets).length;
  res.json({
    status: "running",
    message: "Temporary Real-Time Chat Server",
    onlineUsers: onlineCount,
    note: "No database. No storage. RAM only.",
  });
});

// Stats Route
app.get("/stats", (req, res) => {
  const onlineCount = Object.keys(io.sockets.sockets).length;
  res.json({
    onlineUsers: onlineCount,
    uptime: process.uptime(),
  });
});

// ✅ FIX: Removed duplicate io.on("connection"). socketHandler will handle it all.
setupSocket(io);

const PORT = process.env.PORT || 3000;

// ✅ FIX: Added missing backticks (`) for template literal
server.listen(PORT, "0.0.0.0", () => {
  console.log("===========================================");
  console.log("  Temporary Real-Time Chat Server");
  console.log("===========================================");
  console.log(`  Server running on port ${PORT}`);
  console.log("  No Database | No Storage | RAM Only");
  console.log("===========================================");
});
