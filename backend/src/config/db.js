const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/field_officer";
const MOCK_DB_DIR = path.join(process.cwd(), "mock_db");

let isMongoConnected = false;

async function connectToDatabase() {
  if (isMongoConnected) return true;

  try {
    const opts = {
      bufferCommands: false,
    };
    await mongoose.connect(MONGODB_URI, opts);
    console.log("🚀 Connected to MongoDB at:", MONGODB_URI);
    isMongoConnected = true;
    return true;
  } catch (error) {
    console.warn("⚠️  MongoDB connection failed. System will use file-based Mock DB fallback.");
    isMongoConnected = false;
    return false;
  }
}

function getMockData(collectionName) {
  if (!fs.existsSync(MOCK_DB_DIR)) {
    fs.mkdirSync(MOCK_DB_DIR, { recursive: true });
  }
  const filePath = path.join(MOCK_DB_DIR, `${collectionName}.json`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]));
    return [];
  }
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function saveMockData(collectionName, data) {
  if (!fs.existsSync(MOCK_DB_DIR)) {
    fs.mkdirSync(MOCK_DB_DIR, { recursive: true });
  }
  const filePath = path.join(MOCK_DB_DIR, `${collectionName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

async function dbQuery(model, collectionName, mongoAction, mockAction) {
  const connected = await connectToDatabase();
  if (connected) {
    try {
      return await mongoAction();
    } catch (err) {
      console.error(`MongoDB operation failed in ${collectionName}:`, err);
      return mockAction();
    }
  } else {
    return mockAction();
  }
}

module.exports = {
  connectToDatabase,
  getMockData,
  saveMockData,
  dbQuery
};
