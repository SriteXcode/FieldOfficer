const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
      type: String, 
      enum: ["Regional Manager", "Supervisor", "Field Officer"], 
      default: "Field Officer" 
    },
    name: { type: String, required: true },
    referralCode: { type: String }, // For Supervisors, used by FOs to sign up under them
    supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // For FOs, links to their Supervisor
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    sessionToken: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);
