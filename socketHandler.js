// ============================================
// 🔥 ADVANCED SOCKET HANDLER WITH ALL FEATURES
// ============================================

const users = {};
const messageHistory = {}; // Store messages temporarily (RAM only)

/**
 * Add a user to online users list
 */
function addUser(socketId, username) {
  users[socketId] = {
    socketId,
    username,
    connectedAt: new Date().toISOString(),
  };
  console.log(`✅ User Added: ${username} (${socketId})`);
}

/**
 * Remove a user from online users list
 */
function removeUser(socketId) {
  const user = users[socketId];
  if (user) {
    console.log(`❌ User Removed: ${user.username} (${socketId})`);
    delete users[socketId];
  }
}

/**
 * Get a specific user
 */
function getUser(socketId) {
  return users[socketId];
}

/**
 * Get all online users
 */
function getOnlineUsers() {
  return Object.values(users);
}

/**
 * Store message in memory (can be replaced with database)
 */
function storeMessage(messageData) {
  const conversationKey = [messageData.senderId, messageData.targetId]
    .sort()
    .join("_");

  if (!messageHistory[conversationKey]) {
    messageHistory[conversationKey] = [];
  }
  messageHistory[conversationKey].push(messageData);
}

/**
 * Get messages between two users
 */
function getMessages(userId1, userId2) {
  const conversationKey = [userId1, userId2].sort().join("_");
  return messageHistory[conversationKey] || [];
}

/**
 * Main Socket Setup Function
 */
function setupSocket(io) {
  io.on("connection", (socket) => {
    console.log("🔗 NEW CONNECTION:", socket.id);

    // ✅ Generate unique username
    const username = `User_${Math.floor(Math.random() * 9999)}`;
    addUser(socket.id, username);

    // ✅ Send user data to the connected user
    socket.emit("user_created", {
      socketId: socket.id,
      username,
    });

    // ✅ Broadcast updated users list to everyone
    io.emit("users_list", getOnlineUsers());

    // ================================
    // 💬 SEND MESSAGE EVENT
    // ================================
    socket.on("send_message", (data) => {
      try {
        const sender = getUser(socket.id);

        if (!sender) {
          console.error("❌ Sender not found");
          return;
        }

        // ✅ Create complete message object
        const messageData = {
          id: `${Date.now()}_${socket.id}`, // Unique ID for edit/delete
          senderId: socket.id,
          senderName: sender.username,
          targetId: data.targetSocketId,
          message: data.message || "",
          timestamp: new Date().toISOString(),
          isSeen: false,
          isDeleted: false,
          isEdited: false,
          replyTo: data.replyTo || null,
          replyToText: data.replyToText || null,
          messageType: data.messageType || "text", // 'text' or 'image'
          imageUrl: data.imageUrl || null, // Base64 image data
        };

        // ✅ Store message in memory
        storeMessage(messageData);

        // ✅ Send to target user
        io.to(data.targetSocketId).emit("receive_message", messageData);

        // ✅ Send confirmation to sender
        socket.emit("receive_message", messageData);

        console.log(
          `📨 Message sent from ${sender.username} to ${data.targetSocketId.substring(0, 8)}...`,
        );
      } catch (error) {
        console.error("❌ Error in send_message:", error);
      }
    });

    // ================================
    // ⌨️ TYPING INDICATOR EVENT
    // ================================
    socket.on("typing", (data) => {
      try {
        const sender = getUser(socket.id);

        if (!sender) return;

        // ✅ Send typing status to target user only
        io.to(data.targetSocketId).emit("user_typing", {
          senderId: socket.id,
          senderName: sender.username,
          isTyping: data.isTyping,
        });

        console.log(
          `⌨️ ${sender.username} is ${data.isTyping ? "typing" : "not typing"}`,
        );
      } catch (error) {
        console.error("❌ Error in typing:", error);
      }
    });

    // ================================
    // ✏️ EDIT MESSAGE EVENT
    // ================================
    socket.on("edit_message", (data) => {
      try {
        const sender = getUser(socket.id);

        if (!sender) return;

        // ✅ Create update object
        const updateData = {
          type: "edited",
          id: data.id,
          message: data.message,
          editedAt: new Date().toISOString(),
        };

        // ✅ Update in memory (if using database, update there too)
        const conversationKey = [socket.id, data.targetSocketId]
          .sort()
          .join("_");
        if (messageHistory[conversationKey]) {
          const messageIndex = messageHistory[conversationKey].findIndex(
            (m) => m.id === data.id,
          );
          if (messageIndex !== -1) {
            messageHistory[conversationKey][messageIndex].message =
              data.message;
            messageHistory[conversationKey][messageIndex].isEdited = true;
          }
        }

        // ✅ Send to both users
        socket.emit("message_updated", updateData);
        io.to(data.targetSocketId).emit("message_updated", updateData);

        console.log(`✏️ Message edited by ${sender.username}`);
      } catch (error) {
        console.error("❌ Error in edit_message:", error);
      }
    });

    // ================================
    // 🗑️ DELETE MESSAGE EVENT
    // ================================
    socket.on("delete_message", (data) => {
      try {
        const sender = getUser(socket.id);

        if (!sender) return;

        // ✅ Create delete update object
        const updateData = {
          type: "deleted",
          id: data.id,
          deletedAt: new Date().toISOString(),
        };

        // ✅ Update in memory
        const conversationKey = [socket.id, data.targetSocketId]
          .sort()
          .join("_");
        if (messageHistory[conversationKey]) {
          const messageIndex = messageHistory[conversationKey].findIndex(
            (m) => m.id === data.id,
          );
          if (messageIndex !== -1) {
            messageHistory[conversationKey][messageIndex].isDeleted = true;
            messageHistory[conversationKey][messageIndex].message =
              "This message was deleted";
          }
        }

        // ✅ Send to both users
        socket.emit("message_updated", updateData);
        io.to(data.targetSocketId).emit("message_updated", updateData);

        console.log(`🗑️ Message deleted by ${sender.username}`);
      } catch (error) {
        console.error("❌ Error in delete_message:", error);
      }
    });

    // ================================
    // 👁️ MESSAGE SEEN EVENT
    // ================================
    socket.on("message_seen", (data) => {
      try {
        // ✅ Create seen update object
        const updateData = {
          type: "seen",
          id: data.id,
          seenAt: new Date().toISOString(),
        };

        // ✅ Update in memory
        const conversationKey = [data.targetSocketId, socket.id]
          .sort()
          .join("_");
        if (messageHistory[conversationKey]) {
          const messageIndex = messageHistory[conversationKey].findIndex(
            (m) => m.id === data.id,
          );
          if (messageIndex !== -1) {
            messageHistory[conversationKey][messageIndex].isSeen = true;
          }
        }

        // ✅ Send to sender
        io.to(data.targetSocketId).emit("message_updated", updateData);

        console.log(`👁️ Message marked as seen`);
      } catch (error) {
        console.error("❌ Error in message_seen:", error);
      }
    });

    // ================================
    // 🔌 DISCONNECT EVENT
    // ================================
    socket.on("disconnect", () => {
      const user = getUser(socket.id);

      if (user) {
        removeUser(socket.id);

        // ✅ Notify all users about disconnect
        io.emit("users_list", getOnlineUsers());
        io.emit("user_disconnected", {
          socketId: socket.id,
          username: user.username,
        });

        console.log(
          `🔌 User disconnected: ${user.username} (${socket.id})\nOnline users: ${getOnlineUsers().length}`,
        );
      }
    });

    // ================================
    // 🚨 ERROR HANDLING
    // ================================
    socket.on("error", (error) => {
      console.error("❌ Socket error:", error);
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Connection error:", error);
    });
  });
}

module.exports = setupSocket;
