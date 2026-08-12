import { describe, it, expect } from 'vitest';
import { calculateLeaderboard, DEFAULT_SCORING_RULES } from '../src/services/scoringEngine';

describe('Scoring Engine Extended Metadata & Zero Submissions', () => {
  const mockTeams = [
    { id: 'team-1', name: 'Alpha GIS', members: ['Alice', 'Bob'] },
    { id: 'team-2', name: 'Beta Spatial', members: ['Charlie', 'Dave'] }
  ];

  const mockClues = [
    { id: 'clue-1', number: 1, title: 'Waypoint 1', points: 500, targetRadiusMeters: 25 },
    { id: 'clue-2', number: 2, title: 'Waypoint 2', points: 500, targetRadiusMeters: 25 }
  ];

  it('should handle zero submissions gracefully without error', () => {
    const results = calculateLeaderboard(mockTeams, [], mockClues);
    expect(results).toHaveLength(2);
    expect(results[0].cluesCompleted).toBe(0);
    expect(results[0].finalScore).toBe(0);
  });

  it('should evaluate extra metadata like elevation and EXIF geotags', () => {
    const mockSubmissions = [
      {
        id: 'sub-1',
        clueId: 'clue-1',
        teamId: 'team-1',
        submittedBy: 'Alice',
        capturedLocation: { lat: -33.036, lng: 151.593, elevationMeters: 35, source: 'EXIF' },
        photoUrl: 'data:image/jpeg;base64,12345',
        isGroupPhotoVerified: true,
        exifData: { lat: -33.036, lng: 151.593 },
        telemetryMetadata: { batteryLevel: '85%', networkStatus: 'ONLINE' }
      }
    ];

    const results = calculateLeaderboard(mockTeams, mockSubmissions, mockClues, DEFAULT_SCORING_RULES, 60, 'Reward elevation endurance and exif precision');
    const team1 = results.find(t => t.teamId === 'team-1');

    expect(team1.cluesCompleted).toBe(1);
    expect(team1.avgElevation).toBe(35);
    expect(team1.exifGeotagCount).toBe(1);
    expect(team1.aiRationale).toContain('Vibe Bonus');
    expect(team1.finalScore).toBeGreaterThan(0);
  });
});
