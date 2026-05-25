const users = {};

function addUser(socketId, username) {
  users[socketId] = {
    socketId,
    username,
    joinedAt: new Date().toISOString(),
  };
}
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e8, // ✅ FIX: 100MB limit (1e6 = 1MB, 1e8 = 100MB) for Base64 Images
});

function removeUser(socketId) {
  delete users[socketId];
}

function getUser(socketId) {
  return users[socketId] || null;
}

function getOnlineUsers() {
  return Object.values(users);
}

function setupSocket(io) {
  io.on("connection", (socket) => {
    console.log("✅ User Connected:", socket.id);

    const username = `User_${Math.floor(Math.random() * 9999)}`;
    addUser(socket.id, username);

    socket.emit("user_created", { socketId: socket.id, username });
    io.emit("users_list", getOnlineUsers());

    console.log(`[USER] ${username} joined (${socket.id})`);

    // ✅ UPDATED: Send Message with ID and new fields
    socket.on("send_message", (data) => {
      const sender = getUser(socket.id);
      if (!sender) return;

      const messageData = {
        id: `${Date.now()}_${socket.id}`, // ✅ NEW: Unique ID
        senderId: socket.id,
        senderName: sender.username,
        targetId: data.targetSocketId,
        message: data.message,
        timestamp: new Date().toISOString(),
        isSeen: false,
        isDeleted: false,
        isEdited: false,
        messageType: data.messageType || "text",
        imageUrl: data.imageUrl || null,
        replyTo: data.replyTo || null,
        replyToText: data.replyToText || null,
      };

      io.to(data.targetSocketId).emit("receive_message", messageData);
      socket.emit("receive_message", messageData);
    });

    // ✅ NEW: Edit Message
    socket.on("edit_message", (data) => {
      const updateData = {
        type: "edited",
        id: data.id,
        message: data.message,
      };
      // Send to sender and receiver
      socket.emit("message_updated", updateData);
      io.to(data.targetSocketId).emit("message_updated", updateData);
    });

    // ✅ NEW: Delete Message
    socket.on("delete_message", (data) => {
      const updateData = {
        type: "deleted",
        id: data.id,
      };
      socket.emit("message_updated", updateData);
      io.to(data.targetSocketId).emit("message_updated", updateData);
    });

    // ✅ NEW: Seen Receipt
    socket.on("message_seen", (data) => {
      const updateData = {
        type: "seen",
        id: data.id,
      };
      // Only send to the original sender
      io.to(data.targetSocketId).emit("message_updated", updateData);
    });

    socket.on("typing", (data) => {
      const sender = getUser(socket.id);
      if (!sender) return;
      io.to(data.targetSocketId).emit("user_typing", {
        senderId: socket.id,
        senderName: sender.username,
        isTyping: data.isTyping,
      });
    });

    socket.on("disconnect", (reason) => {
      const user = getUser(socket.id);
      if (user) {
        console.log(
          `❌ User Disconnected: ${user.username} - Reason: ${reason}`,
        );
        removeUser(socket.id);
        io.emit("users_list", getOnlineUsers());
        io.emit("user_disconnected", {
          socketId: socket.id,
          username: user.username,
        });
      }
    });
  });
}

module.exports = setupSocket;
