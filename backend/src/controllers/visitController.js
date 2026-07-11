const Visit = require("../models/Visit.js");
const User = require("../models/User.js");
const { reverseGeocode } = require("../utils/geo.js");
const { logAction } = require("../utils/audit.js");
const { getMockData, saveMockData, connectToDatabase } = require("../config/db.js");

const MAX_ACCEPTABLE_ACCURACY_METERS = 150;

async function logVisit(req, res) {
  try {
    if (req.user.role !== "Field Officer") {
      return res.status(403).json({ error: "Only Field Officers can log visits." });
    }

    const { 
      consumerName, 
      consumerPhone, 
      consumerAddress, 
      latitude, 
      longitude, 
      comment, 
      photo, 
      battery, 
      network, 
      accuracy, 
      device, 
      browser,
      gpsTimestamp,
      webdriver,
      isPrivate
    } = req.body;

    if (!consumerName || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "Consumer name and coordinates are required." });
    }

    const numericAccuracy = Number(accuracy);
    if (!Number.isFinite(numericAccuracy) || numericAccuracy > MAX_ACCEPTABLE_ACCURACY_METERS) {
      return res.status(400).json({
        error: `GPS accuracy must be ${MAX_ACCEPTABLE_ACCURACY_METERS}m or better. Current accuracy: ${Number.isFinite(numericAccuracy) ? Math.round(numericAccuracy) : "unknown"}m.`
      });
    }

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];

    // Fraud Detection
    const LiveLocation = require("../models/LiveLocation.js");
    let prevPings = [];
    try {
      await connectToDatabase();
      prevPings = await LiveLocation.find({ userId: req.user.id, date: dateStr })
        .sort({ timestamp: -1 })
        .limit(3)
        .lean();
    } catch (e) {
      const mockLocations = getMockData("LiveLocation");
      prevPings = mockLocations
        .filter(l => l.userId === req.user.id && l.date === dateStr)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 3);
    }

    const { verifyLocationPayload } = require("../utils/geo.js");
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    const verification = await verifyLocationPayload({
      latitude,
      longitude,
      accuracy,
      gpsTimestamp,
      webdriver,
      ip: clientIp,
      prevPings,
      isPrivate
    });
    
    const isSuspicious = verification.isSuspicious;
    const suspiciousReason = verification.suspiciousReason;

    if (isSuspicious) {
      await logAction({
        userId: req.user.id,
        action: "GPS Spoofing Detected",
        details: `Flagged during visit logging: ${suspiciousReason}`,
        req
      });
    }

    // Verify address
    const detectedAddress = await reverseGeocode(latitude, longitude);
    const finalConsumerAddress = consumerAddress || detectedAddress;

    const supervisorId = req.user.supervisorId;
    if (!supervisorId) {
      return res.status(400).json({ error: "No supervisor is assigned to you." });
    }

    let result = null;

    try {
      await connectToDatabase();
      result = await Visit.create({
        userId: req.user.id,
        supervisorId,
        consumerName,
        consumerPhone,
        consumerAddress: finalConsumerAddress,
        location: { latitude, longitude },
        detectedAddress,
        timestamp: now,
        comment: comment || "",
        photo: photo || "",
        status: "Visited",
        battery,
        network,
        accuracy,
        device: device || "Unknown Device",
        browser: browser || "Unknown Browser",
        isSuspicious,
        suspiciousReason
      });
    } catch (e) {
      const mockVisits = getMockData("Visit");
      const visitId = `visit_${Date.now()}`;
      const newVisit = {
        _id: visitId,
        id: visitId,
        userId: req.user.id,
        supervisorId,
        consumerName,
        consumerPhone,
        consumerAddress: finalConsumerAddress,
        location: { latitude, longitude },
        detectedAddress,
        timestamp: now.toISOString(),
        comment: comment || "",
        photo: photo || "",
        status: "Visited",
        battery,
        network,
        accuracy,
        device: device || "Unknown Device",
        browser: browser || "Unknown Browser",
        isSuspicious,
        suspiciousReason,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };
      mockVisits.push(newVisit);
      saveMockData("Visit", mockVisits);
      result = newVisit;
    }

    await logAction({
      userId: req.user.id,
      action: "Visit Added",
      details: `Logged visit for consumer '${consumerName}' at '${detectedAddress}'. Comment: '${comment || "none"}'`,
      req
    });

    return res.status(201).json({ 
      message: "Visit logged successfully", 
      visit: result,
      isSuspicious
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getVisits(req, res) {
  try {
    const { date, userId, search } = req.query;
    let queryUserId = req.user.id;

    if (req.user.role === "Field Officer") {
      queryUserId = req.user.id;
    } else {
      if (userId) {
        let targetUser = null;
        try {
          await connectToDatabase();
          targetUser = await User.findById(userId);
        } catch (e) {
          const mockUsers = getMockData("User");
          targetUser = mockUsers.find(u => u._id === userId || u.id === userId);
        }

        if (!targetUser || (req.user.role === "Supervisor" && targetUser.supervisorId?.toString() !== req.user.id)) {
          return res.status(403).json({ error: "Access denied. Field Officer not assigned to you." });
        }
        queryUserId = userId;
      } else {
        let fosList = [];
        try {
          await connectToDatabase();
          const fos = await User.find({ supervisorId: req.user.id, role: "Field Officer" }).select("_id");
          fosList = fos.map(f => f._id.toString());
        } catch (e) {
          const mockUsers = getMockData("User");
          fosList = mockUsers
            .filter(u => u.supervisorId === req.user.id && u.role === "Field Officer")
            .map(u => u._id || u.id);
        }

        let visitsRecords = [];
        try {
          await connectToDatabase();
          const query = { userId: { $in: fosList } };
          if (date) {
            const start = new Date(date);
            start.setHours(0,0,0,0);
            const end = new Date(date);
            end.setHours(23,59,59,999);
            query.timestamp = { $gte: start, $lte: end };
          }
          visitsRecords = await Visit.find(query).populate("userId", "name username").sort({ timestamp: -1 }).lean();
        } catch (e) {
          const mockVisits = getMockData("Visit");
          const mockUsers = getMockData("User");
          visitsRecords = mockVisits
            .filter(v => fosList.includes(v.userId) && (!date || v.timestamp.startsWith(date)))
            .map(v => {
              const u = mockUsers.find(user => (user._id || user.id) === v.userId);
              return {
                ...v,
                userId: u ? { _id: u._id || u.id, name: u.name, username: u.username } : v.userId
              };
            });
        }

        if (search) {
          const q = search.toLowerCase();
          visitsRecords = visitsRecords.filter(v => 
            v.consumerName.toLowerCase().includes(q) ||
            (v.consumerPhone && v.consumerPhone.includes(q)) ||
            v.consumerAddress.toLowerCase().includes(q) ||
            v.detectedAddress.toLowerCase().includes(q) ||
            (v.userId && v.userId.name && v.userId.name.toLowerCase().includes(q))
          );
        }

        return res.status(200).json({ visits: visitsRecords });
      }
    }

    let records = [];
    try {
      await connectToDatabase();
      const query = { userId: queryUserId };
      if (date) {
        const start = new Date(date);
        start.setHours(0,0,0,0);
        const end = new Date(date);
        end.setHours(23,59,59,999);
        query.timestamp = { $gte: start, $lte: end };
      }
      records = await Visit.find(query).sort({ timestamp: -1 }).lean();
    } catch (e) {
      const mockVisits = getMockData("Visit");
      records = mockVisits
        .filter(v => v.userId === queryUserId && (!date || v.timestamp.startsWith(date)))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    if (search) {
      const q = search.toLowerCase();
      records = records.filter(v => 
        v.consumerName.toLowerCase().includes(q) ||
        (v.consumerPhone && v.consumerPhone.includes(q)) ||
        v.consumerAddress.toLowerCase().includes(q) ||
        v.detectedAddress.toLowerCase().includes(q)
      );
    }

    return res.status(200).json({ visits: records });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  logVisit,
  getVisits
};
