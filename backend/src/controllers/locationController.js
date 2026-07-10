const LiveLocation = require("../models/LiveLocation.js");
const User = require("../models/User.js");
const Attendance = require("../models/Attendance.js");
const { isSpeedUnrealistic } = require("../utils/geo.js");
const { getMockData, saveMockData, connectToDatabase } = require("../config/db.js");

async function logLiveLocation(req, res) {
  try {
    if (req.user.role !== "Field Officer") {
      return res.status(403).json({ error: "Only Field Officers can send live locations." });
    }

    const { latitude, longitude, accuracy, battery, network, device, gpsTimestamp, webdriver } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "Latitude and Longitude are required." });
    }

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];

    // Fraud Detection
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

    const prevPing = prevPings[0] || null;

    const { verifyLocationPayload } = require("../utils/geo.js");
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    
    const verification = await verifyLocationPayload({
      latitude,
      longitude,
      accuracy,
      gpsTimestamp,
      webdriver,
      ip: clientIp,
      prevPings
    });
    
    const isSuspicious = verification.isSuspicious;
    const suspiciousReason = verification.suspiciousReason;

    // Geocode current live location (optimized to save API quota on high-frequency pings)
    let address = "";
    let shouldGeocode = true;
    if (prevPing && prevPing.latitude && prevPing.longitude) {
      const { calculateDistance } = require("../utils/geo.js");
      const distFromLast = calculateDistance(prevPing.latitude, prevPing.longitude, latitude, longitude);
      if (distFromLast < 0.05 && prevPing.address) { // Less than 50 meters
        address = prevPing.address;
        shouldGeocode = false;
      }
    }

    if (shouldGeocode) {
      try {
        const { reverseGeocode } = require("../utils/geo.js");
        address = await reverseGeocode(latitude, longitude);
      } catch (ge) {
        console.error("Failed to reverse geocode live location", ge);
      }
    }

    let savedLoc = null;
    try {
      await connectToDatabase();
      savedLoc = await LiveLocation.create({
        userId: req.user.id,
        date: dateStr,
        latitude,
        longitude,
        accuracy,
        battery,
        network,
        device,
        address,
        timestamp: now,
        isSuspicious,
        suspiciousReason
      });
    } catch (e) {
      const mockLocations = getMockData("LiveLocation");
      const locId = `loc_${Date.now()}`;
      savedLoc = {
        _id: locId,
        id: locId,
        userId: req.user.id,
        date: dateStr,
        latitude,
        longitude,
        accuracy,
        battery,
        network,
        device,
        address,
        timestamp: now.toISOString(),
        isSuspicious,
        suspiciousReason,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };
      mockLocations.push(savedLoc);
      saveMockData("LiveLocation", mockLocations);
    }

    // Update running distance in today's attendance record
    let att = null;
    const { calculateDistance } = require("../utils/geo.js");
    try {
      await connectToDatabase();
      att = await Attendance.findOne({ userId: req.user.id, date: dateStr });
    } catch (e) {
      const mockAttendance = getMockData("Attendance");
      att = mockAttendance.find(a => a.userId === req.user.id && a.date === dateStr);
    }

    if (att) {
      let prevLat = null;
      let prevLng = null;

      if (prevPing) {
        prevLat = prevPing.latitude;
        prevLng = prevPing.longitude;
      } else if (att.checkIn) {
        prevLat = att.checkIn.latitude;
        prevLng = att.checkIn.longitude;
      }

      if (prevLat !== null && prevLng !== null) {
        const addedDist = calculateDistance(prevLat, prevLng, latitude, longitude);
        att.distanceCovered = Number(((att.distanceCovered || 0) + addedDist).toFixed(2));
        
        // Save back
        try {
          await Attendance.updateOne(
            { _id: att._id },
            { $set: { distanceCovered: att.distanceCovered } }
          );
        } catch (e) {
          const mockAttendance = getMockData("Attendance");
          const idx = mockAttendance.findIndex(a => a._id === att._id || a.id === att.id);
          if (idx !== -1) {
            mockAttendance[idx].distanceCovered = att.distanceCovered;
            saveMockData("Attendance", mockAttendance);
          }
        }
      }
    }

    // Broadcast live updates over Socket.IO
    const io = req.app.get("io");
    if (io) {
      io.to(`supervisor_${req.user.supervisorId}`).emit("location_update", {
        userId: req.user.id,
        name: req.user.name,
        latitude,
        longitude,
        accuracy,
        battery,
        network,
        isSuspicious,
        suspiciousReason,
        checkedIn: true,
        checkedOut: false,
        status: att ? att.status : "Present",
        distanceCovered: att ? att.distanceCovered : 0,
        timestamp: now.toISOString(),
        lastLocationAddress: address || null,
        checkIn: att?.checkIn || null
      });
    }

    return res.status(200).json({ 
      message: "Location updated successfully", 
      location: savedLoc,
      isSuspicious 
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getLocationHistory(req, res) {
  try {
    const { userId, date } = req.query;

    if (!userId || !date) {
      return res.status(400).json({ error: "Field Officer userId and date (YYYY-MM-DD) are required." });
    }

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

    let pings = [];
    try {
      await connectToDatabase();
      pings = await LiveLocation.find({ userId, date }).sort({ timestamp: 1 }).lean();
    } catch (e) {
      const mockLocations = getMockData("LiveLocation");
      pings = mockLocations
        .filter(l => l.userId === userId && l.date === date)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }

    return res.status(200).json({ locations: pings });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getLiveOfficers(req, res) {
  try {
    if (req.user.role !== "Supervisor" && req.user.role !== "Regional Manager") {
      return res.status(403).json({ error: "Unauthorized access." });
    }

    const todayStr = req.query.date || new Date().toISOString().split("T")[0];

    // Find all FOs under this supervisor
    let fos = [];
    try {
      await connectToDatabase();
      fos = await User.find({ supervisorId: req.user.id, role: "Field Officer" }).select("name username status").lean();
    } catch (e) {
      const mockUsers = getMockData("User");
      fos = mockUsers
        .filter(u => u.supervisorId === req.user.id && u.role === "Field Officer")
        .map(u => ({ _id: u._id || u.id, name: u.name, username: u.username, status: u.status }));
    }

    const foIds = fos.map(f => f._id?.toString() || f.id);

    // Get today's attendance records
    let attendance = [];
    try {
      await connectToDatabase();
      attendance = await Attendance.find({ userId: { $in: foIds }, date: todayStr }).lean();
    } catch (e) {
      const mockAttendance = getMockData("Attendance");
      attendance = mockAttendance.filter(a => foIds.includes(a.userId) && a.date === todayStr);
    }

    // Retrieve supervisor timings to calculate late minutes
    let officeStart = "09:00 AM";
    const Setting = require("../models/Setting.js");
    try {
      await connectToDatabase();
      const settings = await Setting.findOne({ supervisorId: req.user.id });
      if (settings) officeStart = settings.officeStart;
    } catch (e) {
      const mockSettings = getMockData("Setting");
      const settings = mockSettings.find(s => s.supervisorId === req.user.id);
      if (settings) officeStart = settings.officeStart;
    }

    let liveStats = [];

    for (const fo of fos) {
      const foId = fo._id?.toString() || fo.id;
      const att = attendance.find(a => a.userId === foId);
      
      let lastPing = null;
      try {
        await connectToDatabase();
        lastPing = await LiveLocation.findOne({ userId: foId, date: todayStr }).sort({ timestamp: -1 }).lean();
      } catch (e) {
        const mockLocations = getMockData("LiveLocation");
        const pings = mockLocations
          .filter(l => l.userId === foId && l.date === todayStr)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (pings.length > 0) lastPing = pings[0];
      }

      // Calculate how many minutes late
      let lateMinutes = 0;
      if (att && att.checkIn && att.status === "Late") {
        const checkInTime = new Date(att.checkIn.time);
        const [timePart, ampm] = officeStart.split(" ");
        let [startHour, startMin] = timePart.split(":").map(Number);
        if (ampm === "PM" && startHour < 12) startHour += 12;
        if (ampm === "AM" && startHour === 12) startHour = 0;
        
        const scheduledTime = new Date(checkInTime);
        scheduledTime.setHours(startHour, startMin, 0, 0);
        
        if (checkInTime > scheduledTime) {
          lateMinutes = Math.round((checkInTime - scheduledTime) / (1000 * 60));
        }
      }

      liveStats.push({
        userId: foId,
        name: fo.name,
        username: fo.username,
        checkedIn: !!att?.checkIn,
        checkedOut: !!att?.checkOut,
        checkInTime: att?.checkIn?.time || null,
        checkOutTime: att?.checkOut?.time || null,
        checkIn: att?.checkIn || null,
        status: att?.status || "Absent",
        lateMinutes,
        distanceCovered: att?.distanceCovered || 0,
        workingHours: att?.workingHours || 0,
        lastSeen: lastPing ? lastPing.timestamp : (att?.checkIn?.time || null),
        lastLocation: lastPing ? { lat: lastPing.latitude, lng: lastPing.longitude, accuracy: lastPing.accuracy } : (att?.checkIn ? { lat: att.checkIn.latitude, lng: att.checkIn.longitude, accuracy: att.checkIn.accuracy } : null),
        lastLocationAddress: lastPing ? (lastPing.address || null) : (att?.checkIn?.address || null),
        battery: lastPing ? lastPing.battery : (att?.checkIn?.battery || null),
        network: lastPing ? lastPing.network : (att?.checkIn?.network || null),
        isSuspicious: lastPing ? !!lastPing.isSuspicious : (att?.checkIn ? !!att.checkIn.isSuspicious : false),
        suspiciousReason: lastPing ? (lastPing.suspiciousReason || "") : (att?.checkIn ? (att.checkIn.suspiciousReason || "") : ""),
      });
    }

    return res.status(200).json({ officers: liveStats });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  logLiveLocation,
  getLocationHistory,
  getLiveOfficers
};
