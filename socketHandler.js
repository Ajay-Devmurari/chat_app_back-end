const users = {};

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("CONNECTED:", socket.id);

    users[socket.id] = {
      socketId: socket.id,
      username: `User_${Math.floor(Math.random() * 9999)}`,
    };

    io.emit("users_list", Object.values(users));

    socket.on("send_message", (data) => {
      const message = {
        id: Date.now().toString(),
        senderId: socket.id,
        senderName: users[socket.id].username,
        targetId: data.targetSocketId,
        message: data.message,
        timestamp: DateTime(),
        messageType: data.messageType || "text",
        imageUrl: data.imageUrl,
        isSeen: false,
        isDeleted: false,
        isEdited: false,
      };

      io.to(data.targetSocketId).emit("receive_message", message);

      socket.emit("receive_message", message);
    });

    socket.on("typing", (data) => {
      io.to(data.targetSocketId).emit("typing", {
        senderId: socket.id,
        isTyping: data.isTyping,
      });
    });

    socket.on("edit_message", (data) => {
      io.to(data.targetSocketId).emit("message_updated", {
        type: "edited",
        id: data.id,
        message: data.message,
      });

      socket.emit("message_updated", {
        type: "edited",
        id: data.id,
        message: data.message,
      });
    });

    socket.on("delete_message", (data) => {
      io.to(data.targetSocketId).emit("message_updated", {
        type: "deleted",
        id: data.id,
      });

      socket.emit("message_updated", {
        type: "deleted",
        id: data.id,
      });
    });

    socket.on("message_seen", (data) => {
      io.to(data.targetSocketId).emit("message_updated", {
        type: "seen",
        id: data.id,
      });
    });

    socket.on("disconnect", () => {
      delete users[socket.id];

      io.emit("users_list", Object.values(users));
    });
  });
};
