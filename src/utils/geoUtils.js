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


