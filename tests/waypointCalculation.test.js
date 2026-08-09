import { describe, it, expect } from 'vitest';
import { calculateOptimalWaypointCount } from '../src/utils/geoUtils.js';

describe('calculateOptimalWaypointCount utility tests', () => {
  it('should calculate waypoints count taking duration, distance, pace, incline, and 5 mins stay into account', () => {
    const startLocation = { lat: -33.0372, lng: 151.5945 };
    const finishLocation = { lat: -33.0395, lng: 151.5960 }; // ~300m away
    const durationMinutes = 60;

    const result = calculateOptimalWaypointCount({
      startLocation,
      finishLocation,
      durationMinutes
    });

    expect(result).toBeDefined();
    expect(result.count).toBeGreaterThanOrEqual(1);
    expect(result.durationMinutes).toBe(60);
    expect(result.timePerWaypointMinutes).toBe(5);
    expect(result.totalWalkMinutes).toBeGreaterThan(0);
    // Walking time + waypoints stay time <= total duration
    expect(result.totalWalkMinutes + result.count * 5).toBeLessThanOrEqual(result.durationMinutes + 5);
  });

  it('should adjust waypoint count for longer duration (90 mins vs 30 mins)', () => {
    const startLocation = { lat: -33.0372, lng: 151.5945 };
    const finishLocation = { lat: -33.0450, lng: 151.6000 };

    const shortDuration = calculateOptimalWaypointCount({
      startLocation,
      finishLocation,
      durationMinutes: 30
    });

    const longDuration = calculateOptimalWaypointCount({
      startLocation,
      finishLocation,
      durationMinutes: 90
    });

    expect(longDuration.count).toBeGreaterThan(shortDuration.count);
  });

  it('should account for elevation incline penalty (Naismith\'s rule)', () => {
    const startLocation = { lat: -33.0372, lng: 151.5945 };
    const finishLocation = { lat: -33.0395, lng: 151.5960 };

    const result = calculateOptimalWaypointCount({
      startLocation,
      finishLocation,
      durationMinutes: 60
    });

    expect(result.inclinePenaltyMinutes).toBeGreaterThanOrEqual(0);
    expect(result.totalWalkMinutes).toBeGreaterThanOrEqual(result.flatWalkingMinutes);
  });

  it('should fallback gracefully to 1 waypoint minimum if duration is very constrained', () => {
    const startLocation = { lat: -33.0372, lng: 151.5945 };
    const finishLocation = { lat: -33.0800, lng: 151.6500 }; // ~7.5km away

    const result = calculateOptimalWaypointCount({
      startLocation,
      finishLocation,
      durationMinutes: 15
    });

    expect(result.count).toBe(1);
  });
});
