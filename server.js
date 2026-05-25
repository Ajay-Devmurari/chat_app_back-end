// ============================================
// 🚀 IMPROVED SERVER CONFIGURATION
// ============================================

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const setupSocket = require("./socketHandler");

const app = express();

// ✅ Create HTTP server
const server = http.createServer(app);

// ✅ Socket.IO Configuration with optimizations
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins (can be restricted in production)
    methods: ["GET", "POST"],
    credentials: true,
  },

  transports: ["websocket", "polling"], // WebSocket first, fallback to polling
  pingTimeout: 60000, // 60 seconds before timeout
  pingInterval: 25000, // Send ping every 25 seconds
  maxHttpBufferSize: 1e8, // 100MB max buffer (for images)
  allowUpgrades: true,
  upgradeTimeout: 10000,
});

// ✅ Enable CORS for HTTP requests
app.use(cors());

// ✅ Express Middleware
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// ✅ Health Check Endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    status: "✅ Server Running",
    message: "Chat server is online",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ✅ Status Endpoint
app.get("/status", (req, res) => {
  res.status(200).json({
    status: "running",
    message: "WebSocket server is active",
    connectedClients: Object.keys(io.sockets.sockets).length,
    timestamp: new Date().toISOString(),
  });
});

// ✅ Not found handler
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

// ✅ Setup Socket.IO handlers
setupSocket(io);

// ✅ Server Configuration
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

// ✅ Start Server
server.listen(PORT, HOST, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║     🚀 CHAT SERVER STARTED 🚀          ║
  ║  ────────────────────────────────────  ║
  ║  Host: ${HOST}                         ║
  ║  Port: ${PORT}                            ║
  ║  Status: ✅ Running                    ║
  ║  Timestamp: ${new Date().toISOString()}    ║
  ╚════════════════════════════════════════╝
  `);
});

// ✅ Error Handling
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
});

// ✅ Graceful Shutdown
process.on("SIGTERM", () => {
  console.log("📛 SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("✅ HTTP server closed");
    process.exit(0);
  });
});
