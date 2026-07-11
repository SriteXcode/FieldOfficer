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

// Check if speed between two consecutive pings exceeds reasonable thresholds (e.g. 250 km/h)
// to flag mock location wrappers/jumps, including instant teleportation jumps.
function isSpeedUnrealistic(lat1, lon1, time1, lat2, lon2, time2) {
  const dist = calculateDistance(lat1, lon1, lat2, lon2);
  const timeDiffMs = Math.abs(new Date(time2) - new Date(time1));
  
  // Ignore speed check if updates are less than 60 seconds apart and the distance is small (<= 2.0 km)
  // to prevent false positives from cellular-to-satellite GPS settling locks.
  if (timeDiffMs < 60000 && dist <= 2.0) {
    return false;
  }
  
  const effectiveTimeDiffMs = Math.max(timeDiffMs, 1000); // prevent division by zero or negative time
  const timeDiffHrs = effectiveTimeDiffMs / (1000 * 60 * 60);
  const speed = dist / timeDiffHrs; // km/h
  
  // Flag if speed exceeds 250 km/h and distance is substantial (> 1.0 km)
  return speed > 250 && dist > 1.0;
}

// Verify location ping for GPS spoofing/developer options simulators
async function verifyLocationPayload({ latitude, longitude, accuracy, gpsTimestamp, webdriver, ip, prevPings, isPrivate }) {
  let isSuspicious = false;
  const reasons = [];

  // 0. Incognito/Private Mode Check
  if (isPrivate === true || isPrivate === "true") {
    isSuspicious = true;
    reasons.push("Private browsing/Incognito mode detected");
  }

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

  // 3. Zero GPS Drift Check
  // Note: Disabled to prevent false positives when users are stationary (in office/home)
  // and the browser returns cached cell/Wi-Fi coordinates which are exactly identical.

  // 4. Stale/Injected GPS Hardware Timestamp Check
  if (gpsTimestamp) {
    let gpsTime = Number(gpsTimestamp);
    if (Number.isFinite(gpsTime)) {
      // Convert Unix timestamp in seconds (10 digits) to milliseconds (13 digits)
      if (gpsTime < 10000000000) {
        gpsTime = gpsTime * 1000;
      }
      
      // Ignore checks if timestamp is relative (uptime/performance.now) or invalid epoch (less than year 2020)
      const minEpoch = new Date("2020-01-01").getTime();
      if (gpsTime >= minEpoch) {
        const serverTime = Date.now();
        // Allow up to 15 minutes discrepancy (900000ms) to accommodate standard browser caching for battery savings
        if (Math.abs(serverTime - gpsTime) > 900000) {
          isSuspicious = true;
          reasons.push("Stale/manipulated GPS hardware timestamp");
        }
      }
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
            // Relaxed mismatch threshold to 1000km to prevent false positives caused by mobile carrier ISP routing gateways
            if (dist > 1000) {
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

  // 6. Static accuracy and zero-drift mock GPS check (accuracy in 1m-3m range with identical values)
  if (accuracy >= 1 && accuracy <= 3 && prevPings && prevPings.length >= 2) {
    let allConstant = true;
    for (const pt of prevPings) {
      if (
        pt.latitude !== latitude ||
        pt.longitude !== longitude ||
        pt.accuracy !== accuracy
      ) {
        allConstant = false;
        break;
      }
    }
    if (allConstant) {
      isSuspicious = true;
      reasons.push("Static GPS precision signature (mock GPS suspected)");
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
