const mongoose = require("mongoose");

const LiveLocationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number },
    battery: { type: Number },
    network: { type: String },
    device: { type: String },
    address: { type: String },
    timestamp: { type: Date, default: Date.now },
    isSuspicious: { type: Boolean, default: false },
    suspiciousReason: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.models.LiveLocation || mongoose.model("LiveLocation", LiveLocationSchema);
