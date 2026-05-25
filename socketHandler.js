const users = {};

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("CONNECTED:", socket.id);

    users[socket.id] = {
      socketId: socket.id,
      username: `User_${Math.floor(Math.random() * 9999)}`,
    };

    // ✅ FIX: User created event was missing
    socket.emit("user_created", {
      socketId: socket.id,
      username: users[socket.id].username,
    });

    io.emit("users_list", Object.values(users));

    socket.on("send_message", (data) => {
      const message = {
        id: `${Date.now()}_${socket.id}`, // ✅ Better unique ID
        senderId: socket.id,
        senderName: users[socket.id].username,
        targetId: data.targetSocketId,
        message: data.message,
        timestamp: new Date().toISOString(), // ✅ CRITICAL FIX: DateTime() was crashing the server
        messageType: data.messageType || "text",
        imageUrl: data.imageUrl || null,
        isSeen: false,
        isDeleted: false,
        isEdited: false,
        replyTo: data.replyTo || null,
        replyToText: data.replyToText || null,
      };

      io.to(data.targetSocketId).emit("receive_message", message);
      socket.emit("receive_message", message);
    });

    // ✅ FIX: Was emitting "typing", frontend expects "user_typing"
    socket.on("typing", (data) => {
      io.to(data.targetSocketId).emit("user_typing", {
        senderId: socket.id,
        senderName: users[socket.id].username,
        isTyping: data.isTyping,
      });
    });

    socket.on("edit_message", (data) => {
      const updateData = { type: "edited", id: data.id, message: data.message };
      io.to(data.targetSocketId).emit("message_updated", updateData);
      socket.emit("message_updated", updateData);
    });

    socket.on("delete_message", (data) => {
      const updateData = { type: "deleted", id: data.id };
      io.to(data.targetSocketId).emit("message_updated", updateData);
      socket.emit("message_updated", updateData);
    });

    socket.on("message_seen", (data) => {
      const updateData = { type: "seen", id: data.id };
      io.to(data.targetSocketId).emit("message_updated", updateData);
    });

    socket.on("disconnect", () => {
      const user = users[socket.id];
      if (user) {
        delete users[socket.id];
        io.emit("users_list", Object.values(users));
        io.emit("user_disconnected", {
          socketId: socket.id,
          username: user.username,
        });
      }
    });
  });
};
