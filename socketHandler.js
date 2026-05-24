const users = {};

function addUser(socketId, username) {
  users[socketId] = {
    socketId,
    username,
    joinedAt: new Date().toISOString(),
  };
}

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

    socket.on("send_message", (data) => {
      const sender = getUser(socket.id);
      if (!sender) return;

      const messageData = {
        senderId: socket.id,
        senderName: sender.username,
        targetId: data.targetSocketId,
        message: data.message,
        timestamp: new Date().toISOString(),
      };

      io.to(data.targetSocketId).emit("receive_message", messageData);
      socket.emit("receive_message", messageData);

      console.log(
        `[MSG] ${sender.username} → ${data.targetSocketId}: ${data.message}`,
      );
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

export default setupSocket;
