const AuditLog = require("../models/AuditLog.js");
const { getMockData, saveMockData, dbQuery } = require("../config/db.js");

async function logAction({ userId, action, details, req }) {
  const userAgent = req?.headers?.["user-agent"] || "unknown";
  const ip = req?.headers?.["x-forwarded-for"] || req?.socket?.remoteAddress || "127.0.0.1";
  
  let device = "Desktop";
  if (/mobile/i.test(userAgent)) device = "Mobile";
  else if (/tablet/i.test(userAgent)) device = "Tablet";
  
  let browser = "Other";
  if (/chrome/i.test(userAgent)) browser = "Chrome";
  else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = "Safari";
  else if (/firefox/i.test(userAgent)) browser = "Firefox";
  else if (/edg/i.test(userAgent)) browser = "Edge";

  const timestamp = new Date();

  await dbQuery(
    AuditLog,
    "AuditLog",
    async () => {
      await AuditLog.create({
        userId,
        action,
        details,
        ip,
        device,
        browser,
        timestamp
      });
    },
    () => {
      const logs = getMockData("AuditLog");
      const newLog = {
        _id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        action,
        details,
        ip,
        device,
        browser,
        timestamp: timestamp.toISOString(),
        createdAt: timestamp.toISOString(),
        updatedAt: timestamp.toISOString()
      };
      logs.push(newLog);
      saveMockData("AuditLog", logs);
    }
  );
}

module.exports = { logAction };
