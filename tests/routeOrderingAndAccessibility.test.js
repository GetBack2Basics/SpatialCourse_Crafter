import { describe, it, expect } from 'vitest';
import { optimizeRouteSequence, isWaypointPublicLandAccessible } from '../src/utils/geoUtils.js';

describe('routeOrderingAndAccessibility utility tests', () => {
  it('should order scrambled waypoints sequentially from start to finish', () => {
    const startLocation = { lat: -33.0370, lng: 151.5930 };
    const finishLocation = { lat: -33.0450, lng: 151.6000 };

    // Scrambled clues along the route
    const clues = [
      { id: 'far', title: 'Far Point', targetLocation: { lat: -33.0440, lng: 151.5990 } },
      { id: 'near', title: 'Near Point', targetLocation: { lat: -33.0380, lng: 151.5940 } },
      { id: 'mid', title: 'Mid Point', targetLocation: { lat: -33.0410, lng: 151.5960 } }
    ];

    const ordered = optimizeRouteSequence(startLocation, clues, finishLocation);

    expect(ordered).toBeDefined();
    expect(ordered.length).toBe(3);
    // Nearest to start should be 'near'
    expect(ordered[0].id).toBe('near');
    expect(ordered[0].number).toBe(1);
    // Mid point should be second
    expect(ordered[1].id).toBe('mid');
    expect(ordered[1].number).toBe(2);
    // Point closest to finish should be last
    expect(ordered[2].id).toBe('far');
    expect(ordered[2].number).toBe(3);
  });

  it('should detect restricted non-public or water keywords in waypoints', () => {
    const validPublicWaypoint = {
      title: 'Foreshore Public Park & Heritage Lookout',
      description: 'Observe native wildlife from the boardwalk deck.',
      category: 'Public Park'
    };

    const restrictedMilitaryWaypoint = {
      title: 'RAAF Military Base Hangar Ramp',
      description: 'Restricted zone - no trespassing beyond military perimeter.',
      category: 'Military'
    };

    const deepSeaWaypoint = {
      title: 'Deep Water Ocean Floor Anomaly',
      description: 'Offshore mooring pin in open ocean.',
      category: 'Maritime'
    };

    expect(isWaypointPublicLandAccessible(validPublicWaypoint)).toBe(true);
    expect(isWaypointPublicLandAccessible(restrictedMilitaryWaypoint)).toBe(false);
    expect(isWaypointPublicLandAccessible(deepSeaWaypoint)).toBe(false);
  });
});
