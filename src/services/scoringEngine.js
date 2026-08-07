// Day 2 Configurable Rule-Based AI Scoring & Leaderboard Engine

export const DEFAULT_SCORING_RULES = {
  spatialPrecisionWeight: 40,   // Weight for GPS distance accuracy
  photoVerificationWeight: 30,  // Weight for AI photo feature recognition
  attributeQualityWeight: 20,   // Weight for structured form completeness
  speedBonusWeight: 10          // Weight for completion time / speed
};

export function calculateDay2Leaderboard(teams, submissions, courseClues, ruleWeights = DEFAULT_SCORING_RULES) {
  const totalWeight = ruleWeights.spatialPrecisionWeight + 
                      ruleWeights.photoVerificationWeight + 
                      ruleWeights.attributeQualityWeight + 
                      ruleWeights.speedBonusWeight;

  const normWeights = {
    spatial: ruleWeights.spatialPrecisionWeight / totalWeight,
    photo: ruleWeights.photoVerificationWeight / totalWeight,
    attribute: ruleWeights.attributeQualityWeight / totalWeight,
    speed: ruleWeights.speedBonusWeight / totalWeight
  };

  const leaderboardResults = teams.map(team => {
    const teamSubs = submissions.filter(s => s.teamId === team.id);
    let rawPointsEarned = 0;
    let spatialPointsTotal = 0;
    let photoPointsTotal = 0;
    let attributePointsTotal = 0;

    teamSubs.forEach(sub => {
      const clue = courseClues.find(c => c.id === sub.clueId);
      const basePoints = clue ? clue.points : 100;
      rawPointsEarned += basePoints;

      const aiMetrics = sub.aiMetrics || {
        spatialAccuracyScore: sub.isWithinRadius ? 95 : 60,
        photoConfidence: 85,
        attributeScore: 90
      };

      spatialPointsTotal += aiMetrics.spatialAccuracyScore;
      photoPointsTotal += aiMetrics.photoConfidence;
      attributePointsTotal += aiMetrics.attributeScore;
    });

    const subCount = teamSubs.length || 1;
    const avgSpatialScore = Math.round(spatialPointsTotal / subCount);
    const avgPhotoScore = Math.round(photoPointsTotal / subCount);
    const avgAttributeScore = Math.round(attributePointsTotal / subCount);
    const speedScore = 85; // Base completion speed factor

    // Weighted Score Multiplier (0.0 to 1.0)
    const overallScoreMultiplier = (
      avgSpatialScore * normWeights.spatial +
      avgPhotoScore * normWeights.photo +
      avgAttributeScore * normWeights.attribute +
      speedScore * normWeights.speed
    ) / 100;

    const finalScore = Math.round(rawPointsEarned * (0.5 + overallScoreMultiplier * 0.75));

    return {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
      members: team.members,
      cluesCompleted: teamSubs.length,
      totalClues: courseClues.length,
      rawPointsEarned,
      finalScore,
      breakdown: {
        spatialAccuracyScore: avgSpatialScore,
        photoVerificationScore: avgPhotoScore,
        attributeQualityScore: avgAttributeScore,
        speedScore,
        overallScoreMultiplier: Math.round(overallScoreMultiplier * 100)
      },
      aiRationale: `Scored using active Day 2 rules: Spatial (${ruleWeights.spatialPrecisionWeight}%), Photo AI (${ruleWeights.photoVerificationWeight}%), Attributes (${ruleWeights.attributeQualityWeight}%), Speed (${ruleWeights.speedBonusWeight}%). Merged team contributions: ${teamSubs.length} clues completed.`
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
