const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");
const { connectToDatabase } = require("./src/config/db.js");

// Controllers
const { register, login, logout, getMe } = require("./src/controllers/authController.js");
const { checkInOrOut, getAttendance } = require("./src/controllers/attendanceController.js");
const { logVisit, getVisits } = require("./src/controllers/visitController.js");
const { logLiveLocation, getLocationHistory, getLiveOfficers } = require("./src/controllers/locationController.js");
const { getSettings, updateSettings } = require("./src/controllers/settingController.js");
const { broadcastAnnouncement, getAnnouncements } = require("./src/controllers/announcementController.js");
const { getAuditLogs, getAnalytics } = require("./src/controllers/reportController.js");

// Middlewares
const { protect, authorize } = require("./src/middleware/auth.js");

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: "*", // In production, restrict to Vite client URL
    methods: ["GET", "POST"]
  }
});

// Expose Socket.IO instance to routes
app.set("io", io);

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: "50mb" })); // Support base64 photos

// Routes
// 1. Auth routes
app.post("/api/auth/register", register);
app.post("/api/auth/login", login);
app.post("/api/auth/logout", protect, logout);
app.get("/api/auth/me", protect, getMe);

// 2. Attendance routes
app.post("/api/attendance", protect, checkInOrOut);
app.get("/api/attendance", protect, getAttendance);

// 3. Consumer Visit routes
app.post("/api/visits", protect, logVisit);
app.get("/api/visits", protect, getVisits);

// 4. Geolocation tracking routes
app.post("/api/locations", protect, logLiveLocation);
app.get("/api/locations/history", protect, getLocationHistory);
app.get("/api/locations/live-officers", protect, getLiveOfficers);

// 5. Settings routes
app.get("/api/settings", protect, getSettings);
app.post("/api/settings", protect, authorize("Supervisor"), updateSettings);

// 6. Broadcast Announcement routes
app.post("/api/announcements", protect, authorize("Supervisor"), broadcastAnnouncement);
app.get("/api/announcements", protect, getAnnouncements);

// 7. Audit & Analytics routes
app.get("/api/reports/audit-logs", protect, authorize("Supervisor", "Regional Manager"), getAuditLogs);
app.get("/api/reports/analytics", protect, authorize("Supervisor", "Regional Manager"), getAnalytics);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date() });
});

const path = require("path");
// Serve static assets in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../client", "dist", "index.html"));
  });
}

// Socket.IO Connections
io.on("connection", (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    console.log(`👤 Client ${socket.id} joined room: ${roomId}`);
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectToDatabase();
  
  server.listen(PORT, () => {
    console.log(`🚀 Express server running on port http://localhost:${PORT}`);
  });
}

startServer();
