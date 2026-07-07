const jwt = require("jsonwebtoken");
const User = require("../models/User.js");
const { getMockData } = require("../config/db.js");

const JWT_SECRET = process.env.JWT_SECRET || "field-officer-super-secret-key-987654321";

async function protect(req, res, next) {
  let token = "";

  // 1. Check Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  } 
  // 2. Check cookies
  else if (req.headers.cookie) {
    const match = req.headers.cookie.match(/token=([^;]+)/);
    if (match) token = match[1];
  }

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Look up user
    let user = null;
    try {
      user = await User.findById(decoded.userId).select("-password").lean();
    } catch (e) {
      const mockUsers = getMockData("User");
      const found = mockUsers.find(u => u._id === decoded.userId || u.id === decoded.userId);
      if (found) {
        const { password, ...rest } = found;
        user = { ...rest, id: found._id || found.id };
      }
    }

    if (!user) {
      return res.status(401).json({ error: "User not found or session expired." });
    }

    req.user = {
      id: user._id?.toString() || user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      supervisorId: user.supervisorId?.toString() || user.supervisorId || null,
      referralCode: user.referralCode || null,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Insufficient permissions." });
    }
    next();
  };
}

module.exports = {
  protect,
  authorize
};
