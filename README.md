# Field Officer Recovery Management PWA System

A high-fidelity, production-ready, mobile-first Progressive Web Application (PWA) designed for tracking field force recovery operations. It consists of a React PWA frontend and a Node.js + Express backend powered by MongoDB (with a persistent mock JSON database fallback).

---

## 🚀 Technology Stack

- **Client**: React (Vite) + JavaScript + Tailwind CSS + Leaflet Maps (OpenStreetMap tiles) + Recharts + PWA Service Workers + IndexedDB (Offline storage)
- **Backend**: Node.js + Express.js + Socket.IO (Real-time locations/broadcasts) + JWT Auth + Bcrypt password hashing + Mongoose / MongoDB (or Local JSON file-based database fallback)

---

## 📂 Project Directory Structure

```
FieldOfficer/
├── backend/
│   ├── package.json
│   ├── server.js (Express server + Socket.IO)
│   ├── src/
│   │   ├── config/ (db connection)
│   │   ├── models/ (User, Settings, Attendance, Visit, LiveLocation, AuditLog, Announcement)
│   │   ├── middleware/ (auth validation, role verification, logging)
│   │   └── utils/ (geo helper, PDF/CSV exporter)
│   └── mock_db/ (local JSON DB fallback if MongoDB is not running)
│
└── client/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    ├── public/
    │   ├── manifest.json
    │   └── sw.js (Custom service worker for caching & offline sync)
    └── src/
        ├── App.jsx (Routing & Activity listeners for autologout)
        ├── main.jsx
        ├── index.css
        ├── components/ (Maps, Replay timeline, Analytics charts, Widgets)
        └── pages/ (Login/Register, FODashboard, SupervisorDashboard, RMDashboard)
```

---

## 🔐 Credentials for Immediate Testing (Pre-seeded in Mock Database)

No MongoDB installation or manual registration is required to view full data. The mock database is pre-seeded with active data:

* **Supervisor Account (Admin)**:
  - **Username**: `alex`
  - **Password**: `password123`
  - **Role**: `Supervisor`
  - **Referral Code**: `REF-ALEX12`

* **Field Officer Account 1 (Active shift, check-in, check-out, consumer visits, and travel path)**:
  - **Username**: `john`
  - **Password**: `password123`
  - **Role**: `Field Officer`
  - **Supervisor Linkage**: Assigned to Alex

* **Field Officer Account 2 (Late check-in, active location watch)**:
  - **Username**: `sarah`
  - **Password**: `password123`
  - **Role**: `Field Officer`
  - **Supervisor Linkage**: Assigned to Alex

---

## 💻 Running the Application Locally

Follow these steps to start both frontend and backend on your local machine:

### 1. Start the Backend Server (Express + Socket.IO)
Open a terminal at the project root, navigate to the `backend` folder, and start the server:
```bash
cd backend
npm run dev
```
*The server will start on [http://localhost:5000](http://localhost:5000). It will attempt to connect to MongoDB. If it cannot find a local MongoDB instance, it will log a warning and fall back to the preloaded file database in `mock_db/` automatically.*

### 2. Start the Frontend Client (Vite React PWA)
Open a second terminal at the project root, navigate to the `client` folder, and spin up Vite:
```bash
cd client
npm run dev
```
*The Vite development server will start on [http://localhost:3000](http://localhost:3000). Vite is configured to proxy all `/api` requests to the Express server running on port 5000.*

---

## 📲 How to Test the Key Features

### 1. View Daily Route & Polyline Highlights
1. Log in as Supervisor `alex` (password: `password123`).
2. On the left sidebar, click on Field Officer **John (Field Officer)**.
3. The map will load and center on John's shift path for today.
4. You will see:
   - A green marker `🟢` representing his shift **Check-In** point.
   - Blue numbered markers `1`, `2`, `3` representing his **Consumer Visit Stops** chronologically.
   - A red marker `🔴` representing his shift **Check-Out** point.
   - A highlighted, dashed **cyan polyline** linking all points in order.

### 2. Run Route Replay Animation
1. With John selected on Supervisor Alex's dashboard, look at the **Route Replay** card.
2. Ensure the date selected is today's date (`2026-07-07`).
3. Click the **Play** button.
4. You will see a yellow marker icon `🛵` representing John animate along the recorded path.
5. Telemetry details (timestamp, battery %, connection type, accuracy meters) update dynamically on each step.
6. Adjust playback speeds using `1x`, `2x`, `5x`, or `10x` buttons, or drag the timeline slider to jump to points.
7. Click any visit stop tag under the replay timeline to jump straight to that customer visit.

### 3. Check Real-Time Socket.IO Location Updates
1. Open one browser window at [http://localhost:3000/login](http://localhost:3000/login) and log in as Field Officer `sarah` (password: `password123`). Click **Check In Shift**.
2. Open a second browser window (e.g., incognito or another browser) and log in as Supervisor `alex`.
3. In the supervisor dashboard, you will see Sarah listed as active with a pulsing green indicator.
4. When Sarah's phone/browser updates its Geolocation pings, coordinates will broadcast over Socket.IO and update the supervisor's active map marker in real-time.

### 4. Experience Offline Mode & Automatic Syncing
1. Log in as Field Officer `john` (or `sarah`).
2. Simulate going offline:
   - Disconnect your internet connection, OR
   - Open Developer Tools (F12) -> Network Tab -> Change throttling from "No throttling" to **"Offline"**.
3. The app's header status badge will change to a flashing red **Offline** notice.
4. Attempt to log a consumer visit (e.g. consumer name "Jane Doe", target address "Mall road"). Click **Submit Logged Visit**.
5. You will see an alert: *"Offline Mode: Visit saved locally. It will upload automatically when online."*
6. Check the top right header: the sync badge will show **"1 Pending"** items queued in IndexedDB.
7. Restore internet connection (change throttling back to "No throttling").
8. The app autodetects connection recovery and begins synchronization: **Sync Started ➔ Uploading Visits ➔ Completed**.
9. The visit log is uploaded to the backend and cleared from IndexedDB.

### 5. Validate Automatic Logout Security Policy
1. Move your mouse or type to interact with the page.
2. Leave the page untouched for 30 minutes.
3. The inactivity event listener will fire, clean the session JWT token cookie, reset state, and redirect you back to the login screen with a security message: *"Security Warning: You have been logged out due to inactivity."*
