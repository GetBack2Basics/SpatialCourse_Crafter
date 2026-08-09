import { describe, it, expect } from 'vitest';
import { generateCourseWithLLM } from '../src/services/courseGeneratorService.js';
import { calculateOptimalWaypointCount, isWaypointPublicLandAccessible, optimizeRouteSequence, calculateHaversineDistance } from '../src/utils/geoUtils.js';
import { PRESET_COURSES } from '../src/data/initialCourse.js';

describe('Cairns Hilton 10-Waypoint Surveying Course Tests', () => {
  it('should verify initial preset course starts and finishes at Cairns Hilton with 10 waypoints', () => {
    const course = PRESET_COURSES[0];

    expect(course.title).toContain('Cairns Hilton Surveying');
    expect(course.startLocation.lat).toBe(-16.9242);
    expect(course.startLocation.lng).toBe(145.7808);
    expect(course.finishLocation.lat).toBe(-16.9242);
    expect(course.finishLocation.lng).toBe(145.7808);

    // Verify exactly 10 waypoints
    expect(course.clues.length).toBe(10);

    // Verify Point D (Waypoint #4) is close to Cairns Hilton (within ~250 meters)
    const pointD = course.clues.find(c => c.title.includes('Point D') || c.number === 4);
    expect(pointD).toBeDefined();
    const distHiltonToD = calculateHaversineDistance(
      course.startLocation.lat,
      course.startLocation.lng,
      pointD.targetLocation.lat,
      pointD.targetLocation.lng
    );
    expect(distHiltonToD).toBeLessThan(300); // Point D brought close (<300m)
  });

  it('should generate a custom 10-waypoint course when user specifies requestedWaypointCount = 10', async () => {
    const startLocation = {
      name: 'Cairns Hilton (34 Wharf St, Cairns QLD)',
      lat: -16.9242,
      lng: 145.7808
    };

    const finishLocation = {
      name: 'Cairns Hilton (34 Wharf St, Cairns QLD)',
      lat: -16.9242,
      lng: 145.7808
    };

    const theme = 'Geodetic Precision';
    const durationMinutes = 45;
    const requestedWaypointCount = 10;

    // 1. Verify custom waypoint count calculation
    const optimalMetrics = calculateOptimalWaypointCount({
      startLocation,
      finishLocation,
      durationMinutes,
      requestedWaypointCount
    });

    expect(optimalMetrics.count).toBe(10);
    expect(optimalMetrics.isCustomOverride).toBe(true);

    // 2. Generate course with custom count
    const course = await generateCourseWithLLM({
      theme,
      startLocation,
      finishLocation,
      durationMinutes,
      requestedWaypointCount
    });

    expect(course).toBeDefined();
    expect(course.clues.length).toBe(10);

    // 3. Verify public land accessibility for all 10 waypoints
    course.clues.forEach(clue => {
      expect(isWaypointPublicLandAccessible(clue)).toBe(true);
    });

    // 4. Verify waypoints are ordered sequentially
    const ordered = optimizeRouteSequence(startLocation, course.clues, finishLocation);
    expect(course.clues[0].id).toBe(ordered[0].id);
    expect(course.clues[9].id).toBe(ordered[9].id);
  });
});
