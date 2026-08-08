import { describe, it, expect } from 'vitest';
import { parseCsvToCourse, parseGeoJsonToCourse, validateCourseSchema } from '../src/utils/courseConverter.js';

describe('courseConverter utility tests', () => {
  it('should parse CSV with lat/lng into a valid SpatialCourse', () => {
    const csvContent = `Name,Latitude,Longitude,Category,Points,Description
Start Base,-33.0360,151.5930,Geospatial,500,Starting waypoint
Catalina Hangar,-33.0385,151.5945,Historical,250,Catalina Flying Boat Hangar`;

    const course = parseCsvToCourse(csvContent, "Test CSV Challenge");
    expect(course).toBeDefined();
    expect(course.title).toBe("Test CSV Challenge");
    expect(course.clues.length).toBe(2);
    expect(course.clues[0].title).toBe("Start Base");
    expect(course.clues[0].targetLocation.lat).toBe(-33.0360);
    expect(course.clues[0].targetLocation.lng).toBe(151.5930);
    expect(course.clues[1].category).toBe("Historical");
    expect(validateCourseSchema(course)).toBe(true);
  });

  it('should parse GeoJSON FeatureCollection into a valid SpatialCourse', () => {
    const geoJson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "Mine Shaft", category: "Historical", points: 150 },
          geometry: { type: "Point", coordinates: [151.5950, -33.0370] }
        }
      ]
    };

    const course = parseGeoJsonToCourse(geoJson, "Test GeoJSON Challenge");
    expect(course).toBeDefined();
    expect(course.clues.length).toBe(1);
    expect(course.clues[0].title).toBe("Mine Shaft");
    expect(course.clues[0].targetLocation.lat).toBe(-33.0370);
    expect(course.clues[0].targetLocation.lng).toBe(151.5950);
    expect(validateCourseSchema(course)).toBe(true);
  });

  it('should throw error on invalid CSV or GeoJSON', () => {
    expect(() => parseCsvToCourse("invalid header\nno lat or lng")).toThrow();
    expect(() => parseGeoJsonToCourse({ type: "Invalid" })).toThrow();
  });
});
