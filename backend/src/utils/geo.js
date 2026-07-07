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

  // Fallback to local simulated locations
  const mockAddresses = [
    "Office Headquarters, MG Road, Ashok Nagar, Bengaluru",
    "Customer Hub, Sector 4, HSR Layout, Bengaluru",
    "Commercial Street, Tasker Town, Shivaji Nagar, Bengaluru",
    "Residential Complex, HAL 2nd Stage, Indiranagar, Bengaluru",
    "Tech Park East Entrance, Outer Ring Road, Mahadevapura, Bengaluru"
  ];
  const idx = Math.abs(Math.floor(lat * 1000 + lon * 1000)) % mockAddresses.length;
  return `${mockAddresses[idx]} (Near ${lat.toFixed(5)}, ${lon.toFixed(5)})`;
}

module.exports = {
  calculateDistance,
  isSpeedUnrealistic,
  reverseGeocode
};
