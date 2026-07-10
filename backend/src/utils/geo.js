// Geolocation calculations and verification helpers

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return Number(d.toFixed(2));
}

// Check if speed between two consecutive pings exceeds reasonable thresholds (e.g. 100 km/h)
// to flag mock location wrappers/jumps
function isSpeedUnrealistic(lat1, lon1, time1, lat2, lon2, time2) {
  const dist = calculateDistance(lat1, lon1, lat2, lon2);
  const timeDiffHrs = Math.abs(new Date(time2) - new Date(time1)) / (1000 * 60 * 60);
  
  if (timeDiffHrs === 0) return false;
  
  const speed = dist / timeDiffHrs; // km/h
  // If speed is greater than 100km/h and distance is substantial (> 0.5km), flag it
  return speed > 100 && dist > 0.5;
}

// Verify location ping for GPS spoofing/developer options simulators
async function verifyLocationPayload({ latitude, longitude, accuracy, gpsTimestamp, webdriver, ip, prevPings }) {
  let isSuspicious = false;
  const reasons = [];

  // 1. Webdriver/Automation check
  if (webdriver === true || webdriver === "true") {
    isSuspicious = true;
    reasons.push("Automated browser/agent detected");
  }

  // 2. Unrealistic Speed Check
  if (prevPings && prevPings.length > 0) {
    const prevPing = prevPings[0];
    const speedUnrealistic = isSpeedUnrealistic(
      prevPing.latitude,
      prevPing.longitude,
      prevPing.timestamp || prevPing.time, // support both models
      latitude,
      longitude,
      new Date()
    );
    if (speedUnrealistic) {
      isSuspicious = true;
      reasons.push("Unrealistic speed/teleportation jump");
    }
  }

  // 3. Zero GPS Drift Check (Android Developer Options Mock GPS / Chrome sensor simulator)
  // Genuine GPS signals always exhibit minor fluctuations (drift) even when stationary.
  // Exactly identical decimal values over 3 consecutive updates indicate a static simulator.
  if (prevPings && prevPings.length >= 2) {
    const p1 = prevPings[0];
    const p2 = prevPings[1];
    if (
      p1.latitude === latitude &&
      p1.longitude === longitude &&
      p2.latitude === latitude &&
      p2.longitude === longitude
    ) {
      isSuspicious = true;
      reasons.push("Constant zero GPS drift (static mock location provider)");
    }
  }

  // 4. Stale/Injected GPS Hardware Timestamp Check
  if (gpsTimestamp) {
    const gpsTime = new Date(Number(gpsTimestamp)).getTime();
    const serverTime = Date.now();
    // If the hardware GPS time differs from the server clock by > 45s, it is stale/mocked.
    if (Number.isFinite(gpsTime) && Math.abs(serverTime - gpsTime) > 45000) {
      isSuspicious = true;
      reasons.push("Stale/manipulated GPS hardware timestamp");
    }
  }

  // 5. IP vs GPS Location Cross-Verification (Geo-IP validation)
  if (ip) {
    const cleanIp = ip.replace("::ffff:", "");
    const isPrivate =
      cleanIp === "::1" ||
      cleanIp === "127.0.0.1" ||
      cleanIp.startsWith("192.168.") ||
      cleanIp.startsWith("10.") ||
      cleanIp.startsWith("172.");

    if (!isPrivate) {
      try {
        const res = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,lat,lon`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.status === "success" && data.lat !== undefined && data.lon !== undefined) {
            const dist = calculateDistance(data.lat, data.lon, latitude, longitude);
            // If reported GPS coordinates mismatch IP provider center by > 200 km, flag it.
            if (dist > 200) {
              isSuspicious = true;
              reasons.push(`Network IP and GPS mismatch (> ${Math.round(dist)}km)`);
            }
          }
        }
      } catch (err) {
        console.error("Geo-IP verification failed:", err);
      }
    }
  }

  return {
    isSuspicious,
    suspiciousReason: reasons.join("; ")
  };
}

async function reverseGeocode(lat, lon) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (apiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && data.status === 'OK' && data.results && data.results.length > 0) {
          return data.results[0].formatted_address;
        } else {
          console.warn("Google Geocoding failed, status:", data ? data.status : 'unknown');
        }
      }
    } catch (err) {
      console.error("Google Geocoding failed:", err);
    }
  }

  // Fallback to OSM Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    
    const res = await fetch(url, {
      headers: {
        "User-Agent": "FieldOfficerTrackerExpress/1.0"
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        return data.display_name;
      }
    }
  } catch (err) {
    console.error("OSM Reverse Geocoding failed:", err);
  }

  // No mock address fallback. Just return the raw coordinates if the API is offline/rate-limited.
  return `GPS Coords: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

module.exports = {
  calculateDistance,
  isSpeedUnrealistic,
  verifyLocationPayload,
  reverseGeocode
};
