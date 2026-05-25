const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const setupSocket = require("./socketHandler");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },

  transports: ["websocket", "polling"],

  pingTimeout: 60000,
  pingInterval: 25000,

  maxHttpBufferSize: 1e8,
});

app.use(cors());

app.get("/", (req, res) => {
  res.json({
    status: "running",
  });
});

setupSocket(io);

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`SERVER RUNNING ON ${PORT}`);
});
