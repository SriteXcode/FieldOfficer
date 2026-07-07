const mongoose = require("mongoose");

const SettingSchema = new mongoose.Schema(
  {
    supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    officeStart: { type: String, default: "09:00 AM" },
    lateAfter: { type: String, default: "09:30 AM" },
    officeEnd: { type: String, default: "06:00 PM" },
    sessionTimeout: { type: Number, default: 1440 }, // In minutes
    liveTrackingInterval: { type: Number, default: 60 } // In seconds
  },
  { timestamps: true }
);

module.exports = mongoose.models.Setting || mongoose.model("Setting", SettingSchema);
