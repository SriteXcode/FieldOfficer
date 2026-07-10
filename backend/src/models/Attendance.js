const mongoose = require("mongoose");

const LocationDetailSchema = new mongoose.Schema({
  time: { type: Date, default: Date.now },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  address: { type: String, required: true },
  battery: { type: Number },
  network: { type: String },
  accuracy: { type: Number },
  device: { type: String },
  browser: { type: String },
  isSuspicious: { type: Boolean, default: false },
  suspiciousReason: { type: String, default: "" }
});

const AttendanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    checkIn: { type: LocationDetailSchema, default: null },
    checkOut: { type: LocationDetailSchema, default: null },
    status: { 
      type: String, 
      enum: ["Present", "Late", "Absent", "Pending Check-out"], 
      default: "Present" 
    },
    workingHours: { type: Number, default: 0 }, // In minutes
    distanceCovered: { type: Number, default: 0 }, // In kilometers
  },
  { timestamps: true }
);

module.exports = mongoose.models.Attendance || mongoose.model("Attendance", AttendanceSchema);
