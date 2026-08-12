// Multi-Factor Leaderboard & Workshop "Vibe-Coding" AI Scoring Engine

export const DEFAULT_SCORING_RULES = {
  spatialPrecisionWeight: 30,   // Weight for GPS distance accuracy
  photoVerificationWeight: 25,  // Weight for AI photo feature recognition
  groupPhotoBonusWeight: 15,    // Weight for mandatory group photo compliance (+15% bonus)
  captureRateWeight: 15,        // Weight for point capture speed (PTS / minute)
  elevationEnduranceWeight: 10, // Weight for altitude/elevation gain bonus
  techPreparednessWeight: 5     // Weight for offline backup & field resilience
};

/**
 * Calculates multi-factor leaderboard scores for all competing teams.
 */
export function calculateLeaderboard(teams, submissions, courseClues = [], ruleWeights = DEFAULT_SCORING_RULES, courseDurationMinutes = 60, vibePrompt = '') {
  const totalWeight = Math.max(1, (
    (ruleWeights.spatialPrecisionWeight || 30) +
    (ruleWeights.photoVerificationWeight || 25) +
    (ruleWeights.groupPhotoBonusWeight || 15) +
    (ruleWeights.captureRateWeight || 15) +
    (ruleWeights.elevationEnduranceWeight || 10) +
    (ruleWeights.techPreparednessWeight || 5)
  ));

  const normWeights = {
    spatial: (ruleWeights.spatialPrecisionWeight || 30) / totalWeight,
    photo: (ruleWeights.photoVerificationWeight || 25) / totalWeight,
    groupPhoto: (ruleWeights.groupPhotoBonusWeight || 15) / totalWeight,
    captureRate: (ruleWeights.captureRateWeight || 15) / totalWeight,
    elevation: (ruleWeights.elevationEnduranceWeight || 10) / totalWeight,
    techPreparedness: (ruleWeights.techPreparednessWeight || 5) / totalWeight
  };

  const leaderboardResults = teams.map(team => {
    const teamSubs = submissions.filter(s => s.teamId === team.id || s.submittedBy === team.name);
    
    let rawPointsEarned = 0;
    let spatialPointsTotal = 0;
    let photoPointsTotal = 0;
    let elevationTotal = 0;
    let groupPhotoVerifiedCount = 0;
    let exifGeotagCount = 0;

    teamSubs.forEach(sub => {
      const clue = courseClues.find(c => c.id === sub.clueId);
      const basePoints = clue ? clue.points : 100;
      rawPointsEarned += basePoints;

      const aiMetrics = sub.aiMetrics || {
        spatialAccuracyScore: sub.capturedLocation?.source === 'EXIF' ? 98 : sub.isWithinRadius ? 92 : 65,
        photoConfidence: sub.photoUrl ? 88 : 50
      };

      spatialPointsTotal += aiMetrics.spatialAccuracyScore;
      photoPointsTotal += aiMetrics.photoConfidence;
      elevationTotal += sub.capturedLocation?.elevationMeters || 15;
      if (sub.capturedLocation?.source === 'EXIF' || sub.exifData?.lat) {
        exifGeotagCount++;
      }

      const isVerifiedGroupPhoto = clue?.requiresGroupPhoto !== false 
        ? Boolean(sub.isGroupPhotoVerified)
        : Boolean(sub.photoUrl);

      if (isVerifiedGroupPhoto) {
        groupPhotoVerifiedCount++;
      }
    });

    const subCount = teamSubs.length || 1;
    const avgSpatialScore = Math.round(spatialPointsTotal / subCount);
    const avgPhotoScore = Math.round(photoPointsTotal / subCount);

    // Group photo compliance ratio (0-100)
    const groupPhotoComplianceScore = teamSubs.length > 0
      ? Math.round((groupPhotoVerifiedCount / teamSubs.length) * 100)
      : 0;

    // Capture rate: Points per minute (assumed 25 mins elapsed base)
    const elapsedMinutes = 25;
    const ptsPerMin = Math.round((rawPointsEarned / elapsedMinutes) * 10) / 10;
    const captureRateScore = Math.min(100, Math.round(ptsPerMin * 2.5));

    // Elevation / Terrain Endurance score (0-100)
    const avgElevation = Math.round(elevationTotal / subCount);
    const elevationEnduranceScore = Math.min(100, Math.round((avgElevation / 35) * 100));

    // Tech Preparedness & Save count (0-100)
    const saveCount = Math.max(
      teamSubs.filter(s => s.usedTechBackup).length,
      team.techBackupSaveCount || (team.usedTechBackup ? 1 : 0)
    );
    const techPreparednessScore = Math.min(100, saveCount * 33 + 34);

    // Weighted Score Multiplier (0.0 to 1.0)
    let overallMultiplier = (
      avgSpatialScore * normWeights.spatial +
      avgPhotoScore * normWeights.photo +
      groupPhotoComplianceScore * normWeights.groupPhoto +
      captureRateScore * normWeights.captureRate +
      elevationEnduranceScore * normWeights.elevation +
      techPreparednessScore * normWeights.techPreparedness
    ) / 100;

    // Vibe-Coding Prompt live modifier adjustment for workshop participants
    let vibeBonusMultiplier = 1.0;
    let vibeRationale = "";
    if (vibePrompt && vibePrompt.trim()) {
      const lowerPrompt = vibePrompt.toLowerCase();
      if (lowerPrompt.includes('group photo') && groupPhotoComplianceScore >= 80) {
        vibeBonusMultiplier += 0.15;
        vibeRationale += " [Vibe Bonus: +15% for High Group Photo Compliance]";
      }
      if ((lowerPrompt.includes('speed') || lowerPrompt.includes('fast')) && ptsPerMin >= 15) {
        vibeBonusMultiplier += 0.10;
        vibeRationale += " [Vibe Bonus: +10% High Speed Capture]";
      }
      if ((lowerPrompt.includes('precision') || lowerPrompt.includes('exif')) && avgSpatialScore >= 90) {
        vibeBonusMultiplier += 0.12;
        vibeRationale += " [Vibe Bonus: +12% Top Spatial/EXIF Precision]";
      }
      if ((lowerPrompt.includes('elevation') || lowerPrompt.includes('endurance') || lowerPrompt.includes('terrain')) && avgElevation >= 20) {
        vibeBonusMultiplier += 0.10;
        vibeRationale += " [Vibe Bonus: +10% Terrain Endurance]";
      }
      if ((lowerPrompt.includes('backup') || lowerPrompt.includes('resilience') || lowerPrompt.includes('tech')) && saveCount > 0) {
        vibeBonusMultiplier += 0.10;
        vibeRationale += " [Vibe Bonus: +10% Tech Resilience & Field Backup]";
      }
    }

    // Labeling Penalty Check: Teams that turn on A-Z labeling hints lose 50 points
    const usedLabelingHint = teamSubs.some(s => s.usedLabelingHint) || Boolean(team.usedLabelingHint);
    const labelingPenalty = usedLabelingHint ? 50 : 0;
    let labelingRationale = usedLabelingHint ? " [Labeling Penalty: -50 PTS for enabling A-Z hints]" : "";

    // Tech Preparedness & Progress Save Bonus: +25 PTS for failure backup + 10 PTS per progress save as they continue
    const usedTechBackup = saveCount > 0;
    const techBackupBonus = usedTechBackup ? 25 + (saveCount - 1) * 10 : 0;
    let backupRationale = usedTechBackup ? ` [Tech Preparedness Bonus: +${techBackupBonus} PTS for saving progress backup (${saveCount} saves)]` : "";

    const calculatedScore = Math.round(rawPointsEarned * (0.4 + overallMultiplier * 0.75) * vibeBonusMultiplier);
    const finalScore = Math.max(0, calculatedScore - labelingPenalty + techBackupBonus);

    return {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color || 'cyan',
      members: team.members || [],
      cluesCompleted: teamSubs.length,
      totalClues: courseClues.length || 5,
      rawPointsEarned,
      finalScore,
      ptsPerMin,
      groupPhotoVerifiedCount,
      exifGeotagCount,
      avgElevation,
      usedLabelingHint,
      labelingPenalty,
      usedTechBackup,
      techBackupBonus,
      saveCount,
      breakdown: {
        spatialAccuracyScore: avgSpatialScore,
        photoVerificationScore: avgPhotoScore,
        groupPhotoComplianceScore,
        captureRateScore,
        elevationEnduranceScore,
        techPreparednessScore,
        labelingPenalty,
        techBackupBonus,
        overallMultiplierPct: Math.round(overallMultiplier * 100)
      },
      aiRationale: `Fail-safe base: ${rawPointsEarned} pts. Metrics: GPS Precision (${avgSpatialScore}%), Photo AI (${avgPhotoScore}%), Group Photos (${groupPhotoComplianceScore}%), Speed (${ptsPerMin} pts/min), Elev (${avgElevation}m).${vibeRationale}${labelingRationale}${backupRationale}`
    };
  });

  // Sort descending by final score
  leaderboardResults.sort((a, b) => b.finalScore - a.finalScore);

  // Assign ranks
  return leaderboardResults.map((result, idx) => ({
    ...result,
    rank: idx + 1
  }));
}

// Backward compatibility alias for Day 2 function signature
export function calculateDay2Leaderboard(teams, submissions, courseClues, ruleWeights) {
  return calculateLeaderboard(teams, submissions, courseClues, ruleWeights);
}
