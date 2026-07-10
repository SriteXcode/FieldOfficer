const mongoose = require("mongoose");

const VisitSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    consumerName: { type: String, required: true },
    consumerPhone: { type: String },
    consumerAddress: { type: String, default: "" },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    detectedAddress: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    comment: { type: String, default: "" },
    photo: { type: String, default: "" }, // Base64 or image URL
    status: { 
      type: String, 
      enum: ["Visited", "Missed", "Pending"], 
      default: "Visited" 
    },
    battery: { type: Number },
    network: { type: String },
    accuracy: { type: Number },
    device: { type: String },
    browser: { type: String },
    isSuspicious: { type: Boolean, default: false },
    suspiciousReason: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Visit || mongoose.model("Visit", VisitSchema);
