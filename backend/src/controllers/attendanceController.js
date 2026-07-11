const Attendance = require("../models/Attendance.js");
const User = require("../models/User.js");
const Setting = require("../models/Setting.js");
const LiveLocation = require("../models/LiveLocation.js");
const { reverseGeocode, calculateDistance } = require("../utils/geo.js");
const { logAction } = require("../utils/audit.js");
const { getMockData, saveMockData, connectToDatabase } = require("../config/db.js");

const MAX_ACCEPTABLE_ACCURACY_METERS = 150;

async function checkInOrOut(req, res) {
  try {
    if (req.user.role !== "Field Officer") {
      return res.status(403).json({ error: "Only Field Officers can record attendance." });
    }

    const { type, latitude, longitude, accuracy, battery, network, device, browser, gpsTimestamp, webdriver, isPrivate } = req.body;

    if (type !== "checkIn" && type !== "checkOut") {
      return res.status(400).json({ error: "Invalid type. Must be checkIn or checkOut." });
    }

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "GPS coordinates are required." });
    }

    const numericAccuracy = Number(accuracy);
    if (!Number.isFinite(numericAccuracy) || numericAccuracy > MAX_ACCEPTABLE_ACCURACY_METERS) {
      return res.status(400).json({
        error: `GPS accuracy must be ${MAX_ACCEPTABLE_ACCURACY_METERS}m or better. Current accuracy: ${Number.isFinite(numericAccuracy) ? Math.round(numericAccuracy) : "unknown"}m.`
      });
    }

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

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
        details: `Flagged during ${type}: ${suspiciousReason}`,
        req
      });
    }

    // Reverse geocode
    const address = await reverseGeocode(latitude, longitude);

    // Settings Timing checks
    let officeStart = "09:00 AM";
    let lateAfter = "09:30 AM";
    let officeEnd = "06:00 PM";

    if (req.user.supervisorId) {
      try {
        await connectToDatabase();
        const settings = await Setting.findOne({ supervisorId: req.user.supervisorId });
        if (settings) {
          officeStart = settings.officeStart;
          lateAfter = settings.lateAfter;
          officeEnd = settings.officeEnd;
        }
      } catch (e) {
        const mockSettings = getMockData("Setting");
        const settings = mockSettings.find(s => s.supervisorId === req.user.supervisorId);
        if (settings) {
          officeStart = settings.officeStart;
          lateAfter = settings.lateAfter;
          officeEnd = settings.officeEnd;
        }
      }
    }

    const [lateHourStr, lateMinStr] = lateAfter.split(" ")[0].split(":");
    const isLatePM = lateAfter.includes("PM");
    let lateHour = parseInt(lateHourStr);
    if (isLatePM && lateHour < 12) lateHour += 12;
    if (!isLatePM && lateHour === 12) lateHour = 0;
    const lateMinute = parseInt(lateMinStr);

    const lateThresholdToday = new Date(now);
    lateThresholdToday.setHours(lateHour, lateMinute, 0, 0);

    const isLate = now > lateThresholdToday;

    const locationDetail = {
      time: now.toISOString(),
      latitude,
      longitude,
      address,
      battery,
      network,
      accuracy,
      device: device || "Unknown Device",
      browser: browser || "Unknown Browser",
      isSuspicious,
      suspiciousReason
    };

    let result = null;

    if (type === "checkIn") {
      let existingRecord = null;
      try {
        await connectToDatabase();
        existingRecord = await Attendance.findOne({ userId: req.user.id, date: dateStr });
      } catch (e) {
        const mockAttendance = getMockData("Attendance");
        existingRecord = mockAttendance.find(a => a.userId === req.user.id && a.date === dateStr);
      }

      if (existingRecord) {
        // If they have checked out already today, allow checking in again
        if (existingRecord.checkOut) {
          try {
            await connectToDatabase();
            result = await Attendance.findOneAndUpdate(
              { userId: req.user.id, date: dateStr },
              {
                checkIn: locationDetail,
                checkOut: null,
                status: isLate ? "Late" : "Present",
                workingHours: 0
              },
              { new: true }
            );
          } catch (e) {
            const mockAttendance = getMockData("Attendance");
            const idx = mockAttendance.findIndex(a => a.userId === req.user.id && a.date === dateStr);
            if (idx !== -1) {
              mockAttendance[idx].checkIn = locationDetail;
              mockAttendance[idx].checkOut = null;
              mockAttendance[idx].status = isLate ? "Late" : "Present";
              mockAttendance[idx].workingHours = 0;
              mockAttendance[idx].updatedAt = now.toISOString();
              result = mockAttendance[idx];
              saveMockData("Attendance", mockAttendance);
            }
          }
        } else {
          return res.status(400).json({ error: "Already checked in today." });
        }
      } else {
        // Create new check-in
        try {
          await connectToDatabase();
          result = await Attendance.create({
            userId: req.user.id,
            date: dateStr,
            checkIn: locationDetail,
            checkOut: null,
            status: isLate ? "Late" : "Present",
          });
        } catch (e) {
          const mockAttendance = getMockData("Attendance");
          const newAttendance = {
            _id: `att_${Date.now()}`,
            id: `att_${Date.now()}`,
            userId: req.user.id,
            date: dateStr,
            checkIn: locationDetail,
            checkOut: null,
            status: isLate ? "Late" : "Present",
            workingHours: 0,
            distanceCovered: 0,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
          };
          mockAttendance.push(newAttendance);
          saveMockData("Attendance", mockAttendance);
          result = newAttendance;
        }
      }

      // Save to LiveLocation to keep a continuous location log for fraud detection
      try {
        await connectToDatabase();
        await LiveLocation.create({
          userId: req.user.id,
          date: dateStr,
          latitude,
          longitude,
          accuracy,
          battery,
          network,
          device: device || "Unknown Device",
          address,
          timestamp: now,
          isSuspicious,
          suspiciousReason
        });
      } catch (e) {
        const mockLocations = getMockData("LiveLocation");
        const locId = `loc_${Date.now()}`;
        mockLocations.push({
          _id: locId,
          id: locId,
          userId: req.user.id,
          date: dateStr,
          latitude,
          longitude,
          accuracy,
          battery,
          network,
          device: device || "Unknown Device",
          address,
          timestamp: now.toISOString(),
          isSuspicious,
          suspiciousReason,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        });
        saveMockData("LiveLocation", mockLocations);
      }

      await logAction({
        userId: req.user.id,
        action: "Check-in",
        details: `Field Officer checked in at ${address}. Status: ${isLate ? "Late" : "Present"}. Accuracy: ${accuracy}m`,
        req
      });

    } else {
      // Check-out
      let attendanceRecord = null;
      try {
        await connectToDatabase();
        attendanceRecord = await Attendance.findOne({ userId: req.user.id, date: dateStr });
      } catch (e) {
        const mockAttendance = getMockData("Attendance");
        attendanceRecord = mockAttendance.find(a => a.userId === req.user.id && a.date === dateStr);
      }

      if (!attendanceRecord) {
        return res.status(400).json({ error: "No check-in record found for today." });
      }

      if (attendanceRecord.checkOut) {
        return res.status(400).json({ error: "Already checked out today." });
      }

      const checkInTime = new Date(attendanceRecord.checkIn.time);
      const workingHours = Math.round((now.getTime() - checkInTime.getTime()) / (1000 * 60));

      let distanceCovered = 0;
      let pathPoints = [];
      try {
        await connectToDatabase();
        pathPoints = await LiveLocation.find({ userId: req.user.id, date: dateStr }).sort({ timestamp: 1 });
      } catch (e) {
        const mockLocations = getMockData("LiveLocation");
        pathPoints = mockLocations
          .filter(l => l.userId === req.user.id && l.date === dateStr)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      }

      let currentLat = attendanceRecord.checkIn.latitude;
      let currentLng = attendanceRecord.checkIn.longitude;
      for (const pt of pathPoints) {
        distanceCovered += calculateDistance(currentLat, currentLng, pt.latitude, pt.longitude);
        currentLat = pt.latitude;
        currentLng = pt.longitude;
      }
      distanceCovered += calculateDistance(currentLat, currentLng, latitude, longitude);
      distanceCovered = Number(distanceCovered.toFixed(2));

      try {
        await connectToDatabase();
        result = await Attendance.findOneAndUpdate(
          { userId: req.user.id, date: dateStr },
          {
            checkOut: locationDetail,
            workingHours,
            distanceCovered,
            status: attendanceRecord.status === "Late" ? "Late" : "Present"
          },
          { new: true }
        );
      } catch (e) {
        const mockAttendance = getMockData("Attendance");
        const idx = mockAttendance.findIndex(a => a.userId === req.user.id && a.date === dateStr);
        if (idx !== -1) {
          mockAttendance[idx].checkOut = locationDetail;
          mockAttendance[idx].workingHours = workingHours;
          mockAttendance[idx].distanceCovered = distanceCovered;
          mockAttendance[idx].updatedAt = now.toISOString();
          result = mockAttendance[idx];
          saveMockData("Attendance", mockAttendance);
        }
      }

      // Save to LiveLocation to keep a continuous location log for fraud detection
      try {
        await connectToDatabase();
        await LiveLocation.create({
          userId: req.user.id,
          date: dateStr,
          latitude,
          longitude,
          accuracy,
          battery,
          network,
          device: device || "Unknown Device",
          address,
          timestamp: now,
          isSuspicious,
          suspiciousReason
        });
      } catch (e) {
        const mockLocations = getMockData("LiveLocation");
        const locId = `loc_${Date.now()}`;
        mockLocations.push({
          _id: locId,
          id: locId,
          userId: req.user.id,
          date: dateStr,
          latitude,
          longitude,
          accuracy,
          battery,
          network,
          device: device || "Unknown Device",
          address,
          timestamp: now.toISOString(),
          isSuspicious,
          suspiciousReason,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        });
        saveMockData("LiveLocation", mockLocations);
      }

      await logAction({
        userId: req.user.id,
        action: "Check-out",
        details: `Field Officer checked out at ${address}. Worked: ${workingHours}m, Travelled: ${distanceCovered}km`,
        req
      });
    }

    // Broadcast check-in / check-out to supervisor in real-time
    const io = req.app.get("io");
    if (io && req.user.supervisorId) {
      io.to(`supervisor_${req.user.supervisorId}`).emit("location_update", {
        userId: req.user.id,
        name: req.user.name,
        latitude,
        longitude,
        accuracy,
        battery,
        network,
        checkedIn: type === "checkIn" || !!result.checkIn,
        checkedOut: type === "checkOut",
        status: result.status,
        distanceCovered: result.distanceCovered || 0,
        timestamp: now.toISOString(),
        checkIn: result.checkIn || null,
        lastLocationAddress: address || null
      });
    }

    return res.status(200).json({ 
      message: `${type === "checkIn" ? "Check-in" : "Check-out"} successful`, 
      attendance: result,
      isSuspicious
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getAttendance(req, res) {
  try {
    const { date, userId } = req.query;
    let queryUserId = req.user.id;

    let resolvedDate = date;
    if (date === "today") {
      resolvedDate = new Date().toISOString().split("T")[0];
    }

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

        let attendanceRecords = [];
        try {
          await connectToDatabase();
          const query = { userId: { $in: fosList } };
          if (resolvedDate) query.date = resolvedDate;
          attendanceRecords = await Attendance.find(query).populate("userId", "name username").lean();
        } catch (e) {
          const mockAttendance = getMockData("Attendance");
          const mockUsers = getMockData("User");
          attendanceRecords = mockAttendance
            .filter(a => fosList.includes(a.userId) && (!resolvedDate || a.date === resolvedDate))
            .map(a => {
              const u = mockUsers.find(user => (user._id || user.id) === a.userId);
              return {
                ...a,
                userId: u ? { _id: u._id || u.id, name: u.name, username: u.username } : a.userId
              };
            });
        }
        return res.status(200).json({ attendance: attendanceRecords });
      }
    }

    let records = [];
    try {
      await connectToDatabase();
      const query = { userId: queryUserId };
      if (resolvedDate) query.date = resolvedDate;
      records = await Attendance.find(query).sort({ date: -1 }).lean();
    } catch (e) {
      const mockAttendance = getMockData("Attendance");
      records = mockAttendance
        .filter(a => a.userId === queryUserId && (!resolvedDate || a.date === resolvedDate))
        .sort((a, b) => b.date.localeCompare(a.date));
    }

    return res.status(200).json({ attendance: records });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  checkInOrOut,
  getAttendance
};
