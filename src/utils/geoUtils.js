// Spatial & Geodetic Utility Functions for FUNGIS GeoScore AI

import exifr from 'exifr';

/**
 * Calculates Haversine distance between two lat/lng coordinates in meters
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal place
}

/**
 * Calculates compass bearing from point A to point B in degrees (0-360)
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const φ1 = lat1 * (Math.PI / 180);
  const φ2 = lat2 * (Math.PI / 180);
  const Δλ = (lon2 - lon1) * (Math.PI / 180);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  const bearing = (θ * (180 / Math.PI) + 360) % 360;
  return Math.round(bearing);
}

/**
 * Maps compass bearing in degrees to 16-point cardinal direction string
 */
export function getCardinalDirection(bearing) {
  const directions = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW'
  ];
  const idx = Math.round((bearing % 360) / 22.5) % 16;
  return directions[idx];
}

/**
 * Calculates exact azimuth heading (degrees + cardinal direction)
 */
export function calculateAzimuth(lat1, lon1, lat2, lon2) {
  const bearing = calculateBearing(lat1, lon1, lat2, lon2);
  const cardinal = getCardinalDirection(bearing);
  return {
    bearing,
    cardinal,
    azimuthStr: `${bearing.toFixed(1)}° ${cardinal}`
  };
}

/**
 * Calculates elevation delta Z (meters) and slope/gradient percentage (%)
 */
export function calculateElevationAndGradient(lat1, lon1, lat2, lon2, targetElevation = null, userElevation = null) {
  const distMeters = calculateHaversineDistance(lat1, lon1, lat2, lon2);
  
  // Estimate elevation profiles if omitted (synthetic terrain model for lake/coastal/mountain terrain)
  const z1 = userElevation !== null ? userElevation : (Math.sin(lat1 * 100) * 15 + Math.cos(lon1 * 100) * 10 + 25);
  const z2 = targetElevation !== null ? targetElevation : (Math.sin(lat2 * 100) * 15 + Math.cos(lon2 * 100) * 10 + 25);
  
  const elevationZ = Math.round((z2 - z1) * 10) / 10; // delta Z in meters
  
  let gradientPct = 0;
  if (distMeters > 0) {
    gradientPct = Math.round((elevationZ / distMeters) * 1000) / 10; // % slope
  }
  
  const slopeText = gradientPct > 0 ? `+${gradientPct}% Incline` : gradientPct < 0 ? `${gradientPct}% Decline` : `0% Flat`;

  return {
    userElevation: Math.round(z1 * 10) / 10,
    targetElevation: Math.round(z2 * 10) / 10,
    elevationZ,
    gradientPct,
    slopeText
  };
}

/**
 * Parses coordinates from raw strings, Google Maps URLs, DMS format, or GPS tracker text.
 * Returns { lat, lng } or null if invalid.
 */
export function parseCoordinates(inputText) {
  if (!inputText || typeof inputText !== 'string') return null;
  const str = inputText.trim();

  // 1. Google Maps URL pattern: /@(-?\d+\.\d+),(-?\d+\.\d+) or q=(-?\d+\.\d+),(-?\d+\.\d+)
  const urlMatch = str.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || str.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (urlMatch) {
    const lat = parseFloat(urlMatch[1]);
    const lng = parseFloat(urlMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // 2. Standard decimal degrees comma/space separated or GPS format: e.g. "-33.0372, 151.5945" or "Lat -33.0372, Lng 151.5945"
  const decMatches = str.match(/(-?\d{1,3}\.\d+)\s*[\s,:]\s*(-?\d{1,3}\.\d+)/);
  if (decMatches) {
    let lat = parseFloat(decMatches[1]);
    let lng = parseFloat(decMatches[2]);
    
    // Check if cardinal directions are present
    if (/S/i.test(str) && lat > 0) lat = -lat;
    if (/W/i.test(str) && lng > 0) lng = -lng;

    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // 3. DMS Degrees Minutes Seconds format e.g. 33°02'13.9"S 151°35'40.2"E
  const dmsMatches = str.match(/(\d+)°\s*(\d+)'\s*([\d.]+)"\s*([NS])\s*(\d+)°\s*(\d+)'\s*([\d.]+)"\s*([EW])/i);
  if (dmsMatches) {
    let lat = parseInt(dmsMatches[1], 10) + parseInt(dmsMatches[2], 10)/60 + parseFloat(dmsMatches[3])/3600;
    if (dmsMatches[4].toUpperCase() === 'S') lat = -lat;
    let lng = parseInt(dmsMatches[5], 10) + parseInt(dmsMatches[6], 10)/60 + parseFloat(dmsMatches[7])/3600;
    if (dmsMatches[8].toUpperCase() === 'W') lng = -lng;
    return { lat, lng };
  }

  return null;
}

/**
 * Parses EXIF metadata from photo file
 */
export async function parsePhotoExif(file) {
  try {
    const output = await exifr.parse(file, ['latitude', 'longitude', 'DateTimeOriginal', 'Make', 'Model']);
    if (output && output.latitude && output.longitude) {
      return {
        lat: output.latitude,
        lng: output.longitude,
        timestamp: output.DateTimeOriginal || new Date().toISOString(),
        device: `${output.Make || ''} ${output.Model || ''}`.trim() || 'Mobile Camera'
      };
    }
  } catch (err) {
    console.warn("EXIF extraction notice:", err.message);
  }
  return null;
}

/**
 * Converts zero-based or one-based index/number to lowercase letter label ('a', 'b', 'c' ... 'z', 'aa', 'ab'...)
 */
export function getWaypointLabel(index) {
  const num = typeof index === 'number' ? index : (parseInt(index, 10) - 1 || 0);
  const idx = num < 0 ? 0 : num;
  
  if (idx < 26) {
    return String.fromCharCode(97 + idx);
  }
  const first = String.fromCharCode(97 + Math.floor(idx / 26) - 1);
  const second = String.fromCharCode(97 + (idx % 26));
  return `${first}${second}`;
}

/**
 * Computes destination coordinate given start lat, lng, distance (meters), and bearing (degrees)
 */
export function destinationPoint(lat, lng, distanceMeters, bearingDegrees) {
  const R = 6371000; // Earth radius in meters
  const δ = distanceMeters / R;
  const θ = bearingDegrees * (Math.PI / 180);
  const φ1 = lat * (Math.PI / 180);
  const λ1 = lng * (Math.PI / 180);

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );
  const λ2 = λ1 + Math.atan2(
    Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
    Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
  );

  return {
    lat: φ2 * (180 / Math.PI),
    lng: λ2 * (180 / Math.PI)
  };
}

/**
 * Generates an organic, irregular "blotch" polygon offset from the true pin center.
 * The centroid is deliberately shifted 20-40% away from the actual lat/lng so players
 * cannot locate the target pin by finding the geometric center of the shape.
 */
export function generateOffsetBlotchPolygon(lat, lng, radiusMeters = 50, numVertices = 12, seed = 0) {
  // Pseudo-random helper from seed
  const pseudoRand = (s) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  // Shift centroid 20% to 45% of radiusMeters in a pseudo-random direction
  const offsetAngle = pseudoRand(seed + 1) * 360;
  const offsetDist = radiusMeters * (0.2 + pseudoRand(seed + 2) * 0.25);
  const offsetCentroid = destinationPoint(lat, lng, offsetDist, offsetAngle);

  const ringCoordinates = [];
  const step = 360 / numVertices;
  let topVertex = { lat: -90, lng: 0 };

  for (let i = 0; i < numVertices; i++) {
    const angle = i * step;
    // Radial jitter between 0.65x and 1.35x radiusMeters
    const jitter = 0.65 + pseudoRand(seed + i * 17) * 0.7;
    const vertexDist = radiusMeters * jitter;
    
    const pt = destinationPoint(offsetCentroid.lat, offsetCentroid.lng, vertexDist, angle);
    ringCoordinates.push([pt.lng, pt.lat]); // MapLibre / GeoJSON expects [lng, lat]

    // Track highest latitude vertex (top center of the blotch polygon)
    if (pt.lat > topVertex.lat) {
      topVertex = pt;
    }
  }

  // Close polygon
  ringCoordinates.push(ringCoordinates[0]);

  return {
    type: "Feature",
    properties: {
      isBlotch: true,
      originalCenter: { lat, lng },
      offsetCentroid: offsetCentroid,
      topCenter: topVertex,
      radiusMeters
    },
    geometry: {
      type: "Polygon",
      coordinates: [ringCoordinates]
    }
  };
}

