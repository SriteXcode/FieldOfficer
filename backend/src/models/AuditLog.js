const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    details: { type: String, required: true },
    ip: { type: String },
    device: { type: String },
    browser: { type: String },
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);
