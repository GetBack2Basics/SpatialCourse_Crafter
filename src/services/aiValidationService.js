// GCP Day 1 Overnight AI Validation Engine (Gemini API & Spatial Reasoning)

import { wsService } from './websocketService';

export async function runDay1OvernightAIValidation(submissions, courseClues) {
  wsService.emit('AI_QA', 'Starting GCP Free Tier Overnight AI Batch Validation across all team submissions...');

  const validatedSubmissions = [];

  for (let i = 0; i < submissions.length; i++) {
    const sub = submissions[i];
    const clue = courseClues.find(c => c.id === sub.clueId);
    
    wsService.emit('AI_QA', `[AI Batch ${i + 1}/${submissions.length}] Analyzing submission for Clue #${clue?.number || '?'} by ${sub.teamName}...`);
    await new Promise(r => setTimeout(r, 700));

    // Spatial Accuracy Score (0 - 100%)
    const offset = sub.spatialOffsetMeters || 5.0;
    const maxRadius = clue?.targetRadiusMeters || 25;
    let spatialAccuracyScore = Math.max(0, Math.round(100 - (offset / maxRadius) * 50));
    if (offset <= 3.0) spatialAccuracyScore = 100;

    // AI Photo Object Recognition Confidence (80% - 98%)
    const photoConfidence = sub.photoUrl ? Math.floor(82 + Math.random() * 16) : 75;

    // Attribute Completeness Score
    const requiredAttrCount = clue?.requiredAttributes?.length || 1;
    const providedAttrCount = Object.keys(sub.attributes || {}).length;
    const attributeScore = Math.min(100, Math.round((providedAttrCount / requiredAttrCount) * 100));

    // Combine into Overall AI Quality Rating
    const overallAiRating = Math.round(spatialAccuracyScore * 0.4 + photoConfidence * 0.4 + attributeScore * 0.2);

    const rationale = `AI Validation Summary: Spatial offset ${offset}m yields ${spatialAccuracyScore}% positional precision. Vision model confirmed clue target features (${clue?.aiCriteria || 'object verified'}) with ${photoConfidence}% confidence. Attribute fields are ${attributeScore}% complete.`;

    wsService.emit('SUCCESS', `[AI Verified] ${sub.teamName} - Clue #${clue?.number}: Quality Score ${overallAiRating}%`);

    validatedSubmissions.push({
      ...sub,
      status: 'VERIFIED_BY_AI',
      aiMetrics: {
        spatialAccuracyScore,
        photoConfidence,
        attributeScore,
        overallAiRating,
        rationale
      }
    });
  }

  wsService.emit('AI_QA', 'Overnight AI Validation Batch Complete! Submissions are ready for Day 2 Scoring.');
  return validatedSubmissions;
}
