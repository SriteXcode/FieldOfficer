const Setting = require("../models/Setting.js");
const { logAction } = require("../utils/audit.js");
const { getMockData, saveMockData, connectToDatabase } = require("../config/db.js");

async function getSettings(req, res) {
  try {
    const supervisorId = req.user.role === "Supervisor" ? req.user.id : req.user.supervisorId;
    if (!supervisorId) {
      return res.status(400).json({ error: "No supervisor linkage found." });
    }

    let settings = null;
    try {
      await connectToDatabase();
      settings = await Setting.findOne({ supervisorId });
      if (!settings) {
        settings = await Setting.create({ supervisorId });
      }
    } catch (e) {
      const mockSettings = getMockData("Setting");
      settings = mockSettings.find(s => s.supervisorId === supervisorId);
      if (!settings) {
        settings = {
          _id: `set_${Date.now()}`,
          supervisorId,
          officeStart: "09:00 AM",
          lateAfter: "09:30 AM",
          officeEnd: "06:00 PM",
          sessionTimeout: 30,
          liveTrackingInterval: 60,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        mockSettings.push(settings);
        saveMockData("Setting", mockSettings);
      }
    }

    return res.status(200).json({ settings });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function updateSettings(req, res) {
  try {
    if (req.user.role !== "Supervisor") {
      return res.status(403).json({ error: "Only Supervisors can edit configurations." });
    }

    const { officeStart, lateAfter, officeEnd, sessionTimeout, liveTrackingInterval } = req.body;

    let settings = null;
    try {
      await connectToDatabase();
      settings = await Setting.findOneAndUpdate(
        { supervisorId: req.user.id },
        { officeStart, lateAfter, officeEnd, sessionTimeout, liveTrackingInterval },
        { new: true, upsert: true }
      );
    } catch (e) {
      const mockSettings = getMockData("Setting");
      const idx = mockSettings.findIndex(s => s.supervisorId === req.user.id);
      if (idx !== -1) {
        mockSettings[idx] = {
          ...mockSettings[idx],
          officeStart,
          lateAfter,
          officeEnd,
          sessionTimeout,
          liveTrackingInterval,
          updatedAt: new Date().toISOString()
        };
        settings = mockSettings[idx];
      } else {
        settings = {
          _id: `set_${Date.now()}`,
          supervisorId: req.user.id,
          officeStart,
          lateAfter,
          officeEnd,
          sessionTimeout,
          liveTrackingInterval,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        mockSettings.push(settings);
      }
      saveMockData("Setting", mockSettings);
    }

    await logAction({
      userId: req.user.id,
      action: "Settings Changed",
      details: `Timings changed: start=${officeStart}, late=${lateAfter}, end=${officeEnd}, timeout=${sessionTimeout}m`,
      req
    });

    return res.status(200).json({ message: "Settings updated successfully", settings });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getSettings,
  updateSettings
};
