const Announcement = require("../models/Announcement.js");
const User = require("../models/User.js");
const { logAction } = require("../utils/audit.js");
const { getMockData, saveMockData, connectToDatabase } = require("../config/db.js");

async function broadcastAnnouncement(req, res) {
  try {
    if (req.user.role !== "Supervisor") {
      return res.status(403).json({ error: "Only Supervisors can broadcast announcements." });
    }

    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and Content are required." });
    }

    const now = new Date();
    let result = null;

    try {
      await connectToDatabase();
      result = await Announcement.create({
        senderId: req.user.id,
        title,
        content
      });
    } catch (e) {
      const mockAnnouncements = getMockData("Announcement");
      const annId = `ann_${Date.now()}`;
      result = {
        _id: annId,
        id: annId,
        senderId: req.user.id,
        title,
        content,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };
      mockAnnouncements.push(result);
      saveMockData("Announcement", mockAnnouncements);
    }

    // Broadcast over Socket.IO to field officers
    const io = req.app.get("io");
    if (io) {
      io.to(`supervisor_${req.user.id}`).emit("new_announcement", {
        title,
        content,
        senderName: req.user.name,
        timestamp: now.toISOString()
      });
    }

    await logAction({
      userId: req.user.id,
      action: "Announcement Sent",
      details: `Broadcasted announcement: '${title}'`,
      req
    });

    return res.status(201).json({ message: "Announcement broadcasted successfully", announcement: result });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getAnnouncements(req, res) {
  try {
    const supervisorId = req.user.role === "Supervisor" ? req.user.id : req.user.supervisorId;
    if (!supervisorId) {
      return res.status(400).json({ error: "No supervisor link associated with this account." });
    }

    let list = [];
    try {
      await connectToDatabase();
      list = await Announcement.find({ senderId: supervisorId }).sort({ createdAt: -1 }).limit(20).lean();
    } catch (e) {
      const mockAnnouncements = getMockData("Announcement");
      list = mockAnnouncements
        .filter(a => a.senderId === supervisorId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 20);
    }

    return res.status(200).json({ announcements: list });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  broadcastAnnouncement,
  getAnnouncements
};
