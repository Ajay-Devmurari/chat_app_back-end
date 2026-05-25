const users = {};

module.exports = (io) => {
io.on("connection", (socket) => {
console.log("✅ CONNECTED:", socket.id);

```
/// ============================================
/// CREATE USER
/// ============================================

users[socket.id] = {
  socketId: socket.id,
  username: `User_${Math.floor(Math.random() * 9999)}`,
};

socket.emit("user_created", {
  socketId: socket.id,
  username: users[socket.id].username,
});

io.emit("users_list", Object.values(users));

/// ============================================
/// SEND MESSAGE
/// ============================================

socket.on("send_message", (data) => {
  try {
    if (!data.targetSocketId) return;

    const message = {
      id: `${Date.now()}_${socket.id}`,
      senderId: socket.id,
      senderName: users[socket.id]?.username || "Unknown",
      targetId: data.targetSocketId,
      message: data.message || "",
      timestamp: new Date().toISOString(),

      // EXTRA FEATURES
      messageType: data.messageType || "text",
      imageUrl: data.imageUrl || null,
      isSeen: false,
      isDeleted: false,
      isEdited: false,
      replyTo: data.replyTo || null,
      replyToText: data.replyToText || null,
    };

    console.log("📩 MESSAGE:", message);

    // Receiver
    io.to(data.targetSocketId).emit(
      "receive_message",
      message
    );

    // Sender
    io.to(socket.id).emit(
      "receive_message",
      message
    );

  } catch (e) {
    console.log("❌ SEND MESSAGE ERROR:", e);
  }
});

/// ============================================
/// TYPING STATUS
/// ============================================

socket.on("typing", (data) => {
  try {
    io.to(data.targetSocketId).emit(
      "user_typing",
      {
        senderId: socket.id,
        senderName:
            users[socket.id]?.username || "Unknown",
        isTyping: data.isTyping,
      }
    );
  } catch (e) {
    console.log("❌ TYPING ERROR:", e);
  }
});

/// ============================================
/// EDIT MESSAGE
/// ============================================

socket.on("edit_message", (data) => {
  try {
    if (!data.id || !data.message) return;

    const updateData = {
      type: "edited",
      id: data.id,
      message: data.message,
    };

    console.log("✏️ MESSAGE EDITED:", updateData);

    // Receiver update
    io.to(data.targetSocketId).emit(
      "message_updated",
      updateData
    );

    // Sender update
    io.to(socket.id).emit(
      "message_updated",
      updateData
    );

  } catch (e) {
    console.log("❌ EDIT ERROR:", e);
  }
});

/// ============================================
/// DELETE MESSAGE
/// ============================================

socket.on("delete_message", (data) => {
  try {
    if (!data.id) return;

    const updateData = {
      type: "deleted",
      id: data.id,
    };

    console.log("🗑️ MESSAGE DELETED:", updateData);

    // Receiver update
    io.to(data.targetSocketId).emit(
      "message_updated",
      updateData
    );

    // Sender update
    io.to(socket.id).emit(
      "message_updated",
      updateData
    );

  } catch (e) {
    console.log("❌ DELETE ERROR:", e);
  }
});

/// ============================================
/// MESSAGE SEEN
/// ============================================

socket.on("message_seen", (data) => {
  try {
    if (!data.id) return;

    const updateData = {
      type: "seen",
      id: data.id,
    };

    console.log("👀 MESSAGE SEEN:", updateData);

    // Notify sender only
    io.to(data.targetSocketId).emit(
      "message_updated",
      updateData
    );

  } catch (e) {
    console.log("❌ SEEN ERROR:", e);
  }
});

/// ============================================
/// DISCONNECT
/// ============================================

socket.on("disconnect", () => {
  try {
    console.log("❌ DISCONNECTED:", socket.id);

    const user = users[socket.id];

    if (user) {
      delete users[socket.id];

      // Update online users
      io.emit(
        "users_list",
        Object.values(users)
      );

      // Notify disconnect
      io.emit("user_disconnected", {
        socketId: socket.id,
        username: user.username,
      });
    }

  } catch (e) {
    console.log("❌ DISCONNECT ERROR:", e);
  }
});
```

});
};
