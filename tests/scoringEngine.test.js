import { describe, it, expect } from 'vitest';
import { calculateLeaderboard, DEFAULT_SCORING_RULES } from '../src/services/scoringEngine.js';

describe('Stage 5: Multi-Factor & Workshop Vibe-Coding Scoring Engine', () => {
  const mockTeams = [
    { id: 'team-mango', name: 'Team Mango (NSW)', color: 'amber', members: ['Jordan', 'Taylor'] },
    { id: 'team-wombat', name: 'Team Wombat (QLD)', color: 'emerald', members: ['Sarah', 'Ken'] }
  ];

  const mockClues = [
    { id: 'clue-1', number: 1, title: 'Waypoint 1', points: 500, requiresGroupPhoto: true },
    { id: 'clue-2', number: 2, title: 'Waypoint 2', points: 300, requiresGroupPhoto: true }
  ];

  const mockSubmissions = [
    {
      id: 'sub-1',
      teamId: 'team-mango',
      clueId: 'clue-1',
      isWithinRadius: true,
      photoUrl: 'blob:http://photo-1',
      isGroupPhotoVerified: true,
      capturedLocation: { lat: -33.0360, lng: 151.5930, source: 'EXIF' }
    },
    {
      id: 'sub-2',
      teamId: 'team-mango',
      clueId: 'clue-2',
      isWithinRadius: true,
      photoUrl: 'blob:http://photo-2',
      isGroupPhotoVerified: true,
      capturedLocation: { lat: -33.0380, lng: 151.5950, source: 'EXIF' }
    },
    {
      id: 'sub-3',
      teamId: 'team-wombat',
      clueId: 'clue-1',
      isWithinRadius: false,
      photoUrl: 'blob:http://photo-3',
      isGroupPhotoVerified: false,
      capturedLocation: { lat: -33.0370, lng: 151.5940, source: 'DEVICE_GPS' }
    }
  ];

  it('should calculate leaderboard scores with base fail-safe points and ranking', () => {
    const results = calculateLeaderboard(mockTeams, mockSubmissions, mockClues, DEFAULT_SCORING_RULES);

    expect(results).toBeDefined();
    expect(results.length).toBe(2);
    expect(results[0].rank).toBe(1);
    expect(results[0].teamId).toBe('team-mango');
    expect(results[0].rawPointsEarned).toBe(800); // 500 + 300
    expect(results[1].rawPointsEarned).toBe(500);
  });

  it('should grant group photo compliance bonus and higher multiplier to compliant team', () => {
    const results = calculateLeaderboard(mockTeams, mockSubmissions, mockClues, DEFAULT_SCORING_RULES);
    
    const mango = results.find(r => r.teamId === 'team-mango');
    const wombat = results.find(r => r.teamId === 'team-wombat');

    expect(mango.breakdown.groupPhotoComplianceScore).toBe(100);
    expect(wombat.breakdown.groupPhotoComplianceScore).toBe(0);
    expect(mango.finalScore).toBeGreaterThan(wombat.finalScore);
  });

  it('should apply Workshop Vibe-Coding prompt modifier when matching keywords', () => {
    const resultsStandard = calculateLeaderboard(mockTeams, mockSubmissions, mockClues, DEFAULT_SCORING_RULES, 60, '');
    const resultsVibe = calculateLeaderboard(mockTeams, mockSubmissions, mockClues, DEFAULT_SCORING_RULES, 60, 'Reward group photo compliance and high speed');

    const mangoStandard = resultsStandard.find(r => r.teamId === 'team-mango');
    const mangoVibe = resultsVibe.find(r => r.teamId === 'team-mango');

    expect(mangoVibe.finalScore).toBeGreaterThan(mangoStandard.finalScore);
    expect(mangoVibe.aiRationale).toContain('Vibe Bonus');
  });
});
