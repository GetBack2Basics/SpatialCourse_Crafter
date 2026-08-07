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
