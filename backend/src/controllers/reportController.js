const AuditLog = require("../models/AuditLog.js");
const User = require("../models/User.js");
const Attendance = require("../models/Attendance.js");
const Visit = require("../models/Visit.js");
const { getMockData, connectToDatabase } = require("../config/db.js");

async function getAuditLogs(req, res) {
  try {
    if (req.user.role !== "Supervisor" && req.user.role !== "Regional Manager") {
      return res.status(403).json({ error: "Only administrators can view audit logs." });
    }

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
    fosList.push(req.user.id);

    let logs = [];
    try {
      await connectToDatabase();
      logs = await AuditLog.find({ userId: { $in: fosList } })
        .populate("userId", "name username role")
        .sort({ timestamp: -1 })
        .limit(100)
        .lean();
    } catch (e) {
      const mockLogs = getMockData("AuditLog");
      const mockUsers = getMockData("User");
      logs = mockLogs
        .filter(l => fosList.includes(l.userId))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 100)
        .map(l => {
          const u = mockUsers.find(user => (user._id || user.id) === l.userId);
          return {
            ...l,
            userId: u ? { _id: u._id || u.id, name: u.name, username: u.username, role: u.role } : l.userId
          };
        });
    }

    return res.status(200).json({ logs });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getAnalytics(req, res) {
  try {
    const supervisorId = req.user.id;
    const { startDate, endDate } = req.query;

    let fos = [];
    try {
      await connectToDatabase();
      fos = await User.find({ supervisorId, role: "Field Officer" }).select("name username").lean();
    } catch (e) {
      const mockUsers = getMockData("User");
      fos = mockUsers
        .filter(u => u.supervisorId === supervisorId && u.role === "Field Officer")
        .map(u => ({ _id: u._id || u.id, name: u.name, username: u.username }));
    }

    const foIds = fos.map(f => f._id?.toString() || f.id);

    let attendance = [];
    let visits = [];
    try {
      await connectToDatabase();
      let attQuery = { userId: { $in: foIds } };
      let visQuery = { userId: { $in: foIds } };
      if (startDate && endDate) {
        attQuery.date = { $gte: startDate, $lte: endDate };
        visQuery.timestamp = { $gte: new Date(startDate), $lte: new Date(endDate + "T23:59:59") };
      }
      attendance = await Attendance.find(attQuery).lean();
      visits = await Visit.find(visQuery).lean();
    } catch (e) {
      const mockAttendance = getMockData("Attendance");
      const mockVisits = getMockData("Visit");
      attendance = mockAttendance.filter(a => foIds.includes(a.userId) && (!startDate || (a.date >= startDate && a.date <= endDate)));
      visits = mockVisits.filter(v => foIds.includes(v.userId) && (!startDate || (v.timestamp >= startDate && v.timestamp <= endDate + "T23:59:59")));
    }

    const officerStats = fos.map(fo => {
      const id = fo._id?.toString() || fo.id;
      const foAttendance = attendance.filter(a => a.userId === id);
      const foVisits = visits.filter(v => v.userId === id);

      const daysPresent = foAttendance.filter(a => a.checkIn).length;
      const daysLate = foAttendance.filter(a => a.status === "Late").length;
      const totalDist = foAttendance.reduce((acc, curr) => acc + (curr.distanceCovered || 0), 0);
      const totalHrs = foAttendance.reduce((acc, curr) => acc + (curr.workingHours || 0), 0) / 60;

      const targetVisitsPerDay = 5;
      const visitRatio = daysPresent > 0 ? (foVisits.length / (daysPresent * targetVisitsPerDay)) : 0;
      const punctualityRatio = daysPresent > 0 ? ((daysPresent - daysLate) / daysPresent) : 0;
      const distanceRatio = daysPresent > 0 ? Math.min(totalDist / (daysPresent * 20), 1) : 0;

      const score = Math.round(
        (Math.min(visitRatio, 1) * 40 + punctualityRatio * 35 + distanceRatio * 25)
      );

      return {
        userId: id,
        name: fo.name,
        username: fo.username,
        visitsCount: foVisits.length,
        distanceTravelled: Number(totalDist.toFixed(2)),
        hoursWorked: Number(totalHrs.toFixed(1)),
        presentDays: daysPresent,
        lateDays: daysLate,
        score: score || 0
      };
    });

    let presentCount = 0;
    let lateCount = 0;
    let pendingCount = 0;

    attendance.forEach(a => {
      if (a.status === "Present") presentCount++;
      else if (a.status === "Late") lateCount++;
      else if (a.status === "Pending Check-out") pendingCount++;
    });

    const attendanceSplit = {
      present: presentCount,
      late: lateCount,
      pending: pendingCount
    };

    const heatmap = visits.map(v => ({
      latitude: v.location.latitude,
      longitude: v.location.longitude,
      consumerName: v.consumerName,
      address: v.detectedAddress
    }));

    return res.status(200).json({
      officers: officerStats,
      attendanceSplit,
      heatmap
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getAuditLogs,
  getAnalytics
};
