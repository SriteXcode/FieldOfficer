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

// Check if speed between two consecutive pings exceeds reasonable thresholds (e.g. 150 km/h)
// to flag mock location wrappers/jumps
function isSpeedUnrealistic(lat1, lon1, time1, lat2, lon2, time2) {
  const dist = calculateDistance(lat1, lon1, lat2, lon2);
  const timeDiffHrs = Math.abs(new Date(time2) - new Date(time1)) / (1000 * 60 * 60);
  
  if (timeDiffHrs === 0) return false;
  
  const speed = dist / timeDiffHrs; // km/h
  // If speed is greater than 150km/h and distance is substantial (> 1km), flag it
  return speed > 150 && dist > 1.0;
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
  reverseGeocode
};
