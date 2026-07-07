const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User.js");
const Setting = require("../models/Setting.js");
const { getMockData, saveMockData, connectToDatabase } = require("../config/db.js");
const { logAction } = require("../utils/audit.js");

const JWT_SECRET = process.env.JWT_SECRET || "field-officer-super-secret-key-987654321";

async function register(req, res) {
  try {
    const { username, password, name, role, referralCode } = req.body;

    if (!username || !password || !name || !role) {
      return res.status(400).json({ error: "Username, password, name, and role are required." });
    }

    if (role === "Field Officer" && !referralCode) {
      return res.status(400).json({ error: "Referral code from a supervisor is required." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Verify existing user
    let userExists = false;
    try {
      await connectToDatabase();
      const existing = await User.findOne({ username });
      if (existing) userExists = true;
    } catch (e) {
      const mockUsers = getMockData("User");
      userExists = mockUsers.some(u => u.username === username);
    }

    if (userExists) {
      return res.status(400).json({ error: "Username is already taken." });
    }

    let supervisorId = null;
    let finalReferralCode = "";

    if (role === "Field Officer") {
      let supervisor = null;
      try {
        await connectToDatabase();
        supervisor = await User.findOne({ referralCode, role: "Supervisor" });
        if (supervisor) supervisorId = supervisor._id;
      } catch (e) {
        const mockUsers = getMockData("User");
        supervisor = mockUsers.find(u => u.referralCode === referralCode && u.role === "Supervisor");
        if (supervisor) supervisorId = supervisor._id || supervisor.id;
      }

      if (!supervisor) {
        return res.status(400).json({ error: "Invalid referral code. Supervisor not found." });
      }
    } else if (role === "Supervisor") {
      finalReferralCode = "REF-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    let savedUser = null;
    try {
      await connectToDatabase();
      const user = await User.create({
        username,
        password: hashedPassword,
        name,
        role,
        referralCode: role === "Supervisor" ? finalReferralCode : undefined,
        supervisorId: role === "Field Officer" ? supervisorId : undefined,
      });

      // If Supervisor, create default Settings
      if (role === "Supervisor") {
        await Setting.create({ supervisorId: user._id });
      }

      savedUser = {
        id: user._id.toString(),
        username: user.username,
        name: user.name,
        role: user.role,
        referralCode: user.referralCode,
        supervisorId: user.supervisorId?.toString()
      };
    } catch (e) {
      // Mock DB save
      const mockUsers = getMockData("User");
      const userId = `user_${Date.now()}`;
      const newUser = {
        _id: userId,
        id: userId,
        username,
        password: hashedPassword,
        name,
        role,
        referralCode: role === "Supervisor" ? finalReferralCode : undefined,
        supervisorId: role === "Field Officer" ? supervisorId : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockUsers.push(newUser);
      saveMockData("User", mockUsers);

      if (role === "Supervisor") {
        const mockSettings = getMockData("Setting");
        mockSettings.push({
          _id: `set_${Date.now()}`,
          supervisorId: userId,
          officeStart: "09:00 AM",
          lateAfter: "09:30 AM",
          officeEnd: "06:00 PM",
          sessionTimeout: 1440,
          liveTrackingInterval: 60,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        saveMockData("Setting", mockSettings);
      }

      savedUser = {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        role: newUser.role,
        referralCode: newUser.referralCode,
        supervisorId: newUser.supervisorId
      };
    }

    return res.status(201).json({
      message: "User registered successfully",
      user: savedUser
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    let user = null;
    try {
      await connectToDatabase();
      user = await User.findOne({ username });
    } catch (e) {
      const mockUsers = getMockData("User");
      user = mockUsers.find(u => u.username === username);
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const userId = user._id ? user._id.toString() : user.id;
    const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);

    try {
      await connectToDatabase();
      await User.updateOne({ _id: user._id }, { $set: { sessionToken } });
    } catch (e) {
      const mockUsers = getMockData("User");
      const idx = mockUsers.findIndex(u => u.username === username);
      if (idx !== -1) {
        mockUsers[idx].sessionToken = sessionToken;
        saveMockData("User", mockUsers);
      }
    }

    const token = jwt.sign(
      { userId, username: user.username, role: user.role, sessionToken },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    const userPayload = {
      id: userId,
      username: user.username,
      name: user.name,
      role: user.role,
      referralCode: user.referralCode || null,
      supervisorId: user.supervisorId ? user.supervisorId.toString() : null,
    };

    await logAction({
      userId,
      action: "Login",
      details: `User ${user.username} logged in successfully`,
      req
    });

    // Set cookie
    res.setHeader(
      "Set-Cookie",
      `token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 30};`
    );

    return res.status(200).json({
      message: "Login successful",
      user: userPayload,
      token
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function logout(req, res) {
  try {
    if (req.user) {
      await logAction({
        userId: req.user.id,
        action: "Logout",
        details: `User ${req.user.username} logged out`,
        req
      });
    }

    res.setHeader(
      "Set-Cookie",
      `token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0;`
    );

    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getMe(req, res) {
  return res.status(200).json({ user: req.user });
}

module.exports = {
  register,
  login,
  logout,
  getMe
};
