const Message = require("../models/Message.js");
const User = require("../models/User.js");
const { getMockData, saveMockData, connectToDatabase } = require("../config/db.js");

async function sendMessage(req, res) {
  try {
    const { receiverId, content, image } = req.body;
    const senderId = req.user.id;

    if (!receiverId) {
      return res.status(400).json({ error: "Receiver ID is required." });
    }

    let result = null;
    const now = new Date();

    try {
      await connectToDatabase();
      result = await Message.create({
        senderId,
        receiverId,
        content: content || "",
        image: image || "",
      });
    } catch (e) {
      const mockMessages = getMockData("Message");
      const msgId = `msg_${Date.now()}`;
      const newMessage = {
        _id: msgId,
        id: msgId,
        senderId,
        receiverId,
        content: content || "",
        image: image || "",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };
      mockMessages.push(newMessage);
      saveMockData("Message", mockMessages);
      result = newMessage;
    }

    // Emit socket event to the chat room
    const io = req.app.get("io");
    if (io) {
      // Emit to sender and receiver rooms
      io.to(`chat_${senderId}`).to(`chat_${receiverId}`).emit("new_message", result);
    }

    return res.status(201).json({ message: "Message sent successfully", chatMessage: result });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getMessages(req, res) {
  try {
    const { userId } = req.query; // target user ID to chat with
    const selfId = req.user.id;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required." });
    }

    let list = [];

    try {
      await connectToDatabase();
      list = await Message.find({
        $or: [
          { senderId: selfId, receiverId: userId },
          { senderId: userId, receiverId: selfId }
        ]
      }).sort({ createdAt: 1 }).lean();
    } catch (e) {
      const mockMessages = getMockData("Message");
      list = mockMessages.filter(
        m => (m.senderId === selfId && m.receiverId === userId) ||
             (m.senderId === userId && m.receiverId === selfId)
      ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    return res.status(200).json({ messages: list });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  sendMessage,
  getMessages
};
