const users = {};

function addUser(socketId, username) {
  users[socketId] = {
    socketId,
    username,
  };
}

function removeUser(socketId) {
  delete users[socketId];
}

function getUser(socketId) {
  return users[socketId];
}

function getOnlineUsers() {
  return Object.values(users);
}

function setupSocket(io) {
  io.on("connection", (socket) => {
    console.log("USER CONNECTED:", socket.id);

    const username = `User_${Math.floor(Math.random() * 9999)}`;

    addUser(socket.id, username);

    socket.emit("user_created", {
      socketId: socket.id,
      username,
    });

    io.emit("users_list", getOnlineUsers());

    socket.on("send_message", (data) => {
      const sender = getUser(socket.id);

      if (!sender) return;

      const messageData = {
        id: `${Date.now()}_${socket.id}`,
        senderId: socket.id,
        senderName: sender.username,
        targetId: data.targetSocketId,
        message: data.message,
        timestamp: new Date().toISOString(),

        isSeen: false,
        isDeleted: false,
        isEdited: false,

        replyTo: data.replyTo,
        replyToText: data.replyToText,

        messageType: data.messageType || "text",
        imageUrl: data.imageUrl || null,
      };

      io.to(data.targetSocketId).emit("receive_message", messageData);

      socket.emit("receive_message", messageData);
    });

    socket.on("typing", (data) => {
      io.to(data.targetSocketId).emit("user_typing", {
        senderId: socket.id,
        isTyping: data.isTyping,
      });
    });

    socket.on("edit_message", (data) => {
      const updateData = {
        type: "edited",
        id: data.id,
        message: data.message,
      };

      socket.emit("message_updated", updateData);

      io.to(data.targetSocketId).emit("message_updated", updateData);
    });

    socket.on("delete_message", (data) => {
      const updateData = {
        type: "deleted",
        id: data.id,
      };

      socket.emit("message_updated", updateData);

      io.to(data.targetSocketId).emit("message_updated", updateData);
    });

    socket.on("message_seen", (data) => {
      io.to(data.targetSocketId).emit("message_updated", {
        type: "seen",
        id: data.id,
      });
    });

    socket.on("disconnect", () => {
      removeUser(socket.id);

      io.emit("users_list", getOnlineUsers());

      io.emit("user_disconnected", {
        socketId: socket.id,
      });

      console.log("DISCONNECTED:", socket.id);
    });
  });
}

module.exports = setupSocket;
