import { describe, it, expect } from 'vitest';
import { generateOffsetBlotchPolygon, calculateHaversineDistance } from '../src/utils/geoUtils.js';

describe('Stage 2: Custom Categories & Offset Blotch Accuracy Masking', () => {
  it('should generate an organic offset blotch polygon feature', () => {
    const lat = -33.0372;
    const lng = 151.5945;
    const radiusMeters = 100;
    
    const blotch = generateOffsetBlotchPolygon(lat, lng, radiusMeters, 12, 42);

    expect(blotch).toBeDefined();
    expect(blotch.type).toBe("Feature");
    expect(blotch.geometry.type).toBe("Polygon");
    
    const coordinates = blotch.geometry.coordinates[0];
    expect(coordinates.length).toBe(13); // 12 vertices + 1 closing vertex

    // First and last coordinates must match (closed polygon loop)
    expect(coordinates[0][0]).toBe(coordinates[12][0]);
    expect(coordinates[0][1]).toBe(coordinates[12][1]);

    // Offset centroid must be shifted away from true center (20%-50% of radiusMeters)
    const centroid = blotch.properties.offsetCentroid;
    const offsetDistance = calculateHaversineDistance(lat, lng, centroid.lat, centroid.lng);
    expect(offsetDistance).toBeGreaterThan(15);
    expect(offsetDistance).toBeLessThan(60);
  });

  it('should generate different offset shapes for different seeds/clue IDs', () => {
    const lat = -33.0372;
    const lng = 151.5945;
    
    const blotch1 = generateOffsetBlotchPolygon(lat, lng, 100, 12, 1);
    const blotch2 = generateOffsetBlotchPolygon(lat, lng, 100, 12, 2);

    const centroid1 = blotch1.properties.offsetCentroid;
    const centroid2 = blotch2.properties.offsetCentroid;

    // Centroids must differ based on seed
    expect(centroid1.lat).not.toBe(centroid2.lat);
  });
});
