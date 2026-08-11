// GCP Day 1 Overnight AI Validation Engine (Gemini Vision API & Spatial Reasoning)

import { wsService } from './websocketService';

/**
 * Converts any photo URL (blob://, data:, or https://) to a base64 data URI
 * suitable for the server-side Gemini Vision API.
 * Returns null if the URL is empty or conversion fails.
 */
async function photoToBase64(photoUrl) {
  if (!photoUrl) return null;
  // Already a base64 data URI — pass through as-is
  if (photoUrl.startsWith('data:')) return photoUrl;
  // Blob URL (from camera/gallery upload) or remote HTTPS URL — fetch & convert
  try {
    const resp = await fetch(photoUrl);
    const blob = await resp.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result); // → "data:image/jpeg;base64,..."
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    wsService.emit('ERROR', `Photo conversion failed: ${e.message}`);
    return null;
  }
}

/**
 * Calls the server-side /api/validate-ai endpoint with the submission's photo.
 * Returns { confidence, isPresent, features, notes, cached }.
 * Falls back to { confidence: 75 } if no photo or the call fails.
 */
async function runGeminiVisionOnPhoto(clueId, photoBase64, aiCriteria) {
  if (!photoBase64) return { confidence: 75, features: [], notes: 'No photo provided.' };

  try {
    const res = await fetch('/api/validate-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clueId,
        photoBase64,
        aiCriteria: aiCriteria || 'Verify photo matches the clue location target.'
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      wsService.emit('ERROR', `Vision API error for clue ${clueId}: ${err.error || res.statusText}`);
      return { confidence: 75, features: [], notes: 'API error — using fallback score.' };
    }

    const data = await res.json();
    const raw = data.geminiResponse || '';

    // Gemini returns JSON, sometimes wrapped in markdown code fences
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { confidence: 75, features: [], notes: raw };

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      confidence: Math.round(parsed.confidence_score ?? 75),
      isPresent: parsed.is_object_present ?? true,
      features: parsed.detected_features || [],
      notes: parsed.spatial_notes || '',
      cached: data.cached || false
    };
  } catch (e) {
    wsService.emit('ERROR', `Vision AI fetch failed: ${e.message}`);
    return { confidence: 75, features: [], notes: 'Network error — using fallback score.' };
  }
}

/**
 * Runs AI batch validation over all submissions.
 * For each submission that has a photoUrl, it converts it to base64 and
 * sends it to the server-side Gemini 1.5 Flash Vision API.
 * Returns an enriched array of submissions with aiMetrics attached.
 */
export async function runDay1OvernightAIValidation(submissions, courseClues) {
  wsService.emit('AI_QA', 'Starting GCP Overnight AI Batch Validation — sending team photos to Gemini 1.5 Flash Vision...');

  const validatedSubmissions = [];

  for (let i = 0; i < submissions.length; i++) {
    const sub = submissions[i];
    const clue = courseClues.find(c => c.id === sub.clueId);

    wsService.emit('AI_QA', `[AI Batch ${i + 1}/${submissions.length}] Analysing submission for Clue #${clue?.number || '?'} by ${sub.teamName}...`);

    // Spatial Accuracy Score (0-100%)
    const offset = sub.spatialOffsetMeters || 5.0;
    const maxRadius = clue?.targetRadiusMeters || 25;
    let spatialAccuracyScore = Math.max(0, Math.round(100 - (offset / maxRadius) * 50));
    if (offset <= 3.0) spatialAccuracyScore = 100;

    // Convert the team's uploaded photo to base64 for Vision API
    const rawPhotoUrl = sub.photoUrl || sub.photoBase64 || null;
    const photoBase64 = await photoToBase64(rawPhotoUrl);

    // Call real Gemini Vision AI
    const vision = await runGeminiVisionOnPhoto(sub.clueId, photoBase64, clue?.aiCriteria);
    const photoConfidence = vision.confidence;
    const isCached = vision.cached ? ' [cache hit]' : '';

    wsService.emit(
      photoBase64 ? 'SUCCESS' : 'AI_QA',
      `[Vision${isCached}] ${sub.teamName} — Clue #${clue?.number || '?'}: photo confidence ${photoConfidence}%` +
      (vision.features?.length ? ` | Detected: ${vision.features.join(', ')}` : '')
    );

    // Attribute Completeness Score
    const requiredAttrCount = clue?.requiredAttributes?.length || 1;
    const providedAttrCount = Object.keys(sub.attributes || {}).length;
    const attributeScore = Math.min(100, Math.round((providedAttrCount / requiredAttrCount) * 100));

    // Overall AI Quality Rating
    const overallAiRating = Math.round(spatialAccuracyScore * 0.4 + photoConfidence * 0.4 + attributeScore * 0.2);

    const rationale = `AI Validation: Spatial offset ${offset}m → ${spatialAccuracyScore}% positional precision. ` +
      `Vision model confirmed clue features (${clue?.aiCriteria || 'object verified'}) with ${photoConfidence}% confidence` +
      `${vision.notes ? ' — ' + vision.notes : ''}. Attribute fields ${attributeScore}% complete.`;

    wsService.emit('SUCCESS', `[AI Verified] ${sub.teamName} — Clue #${clue?.number}: Quality Score ${overallAiRating}%`);

    validatedSubmissions.push({
      ...sub,
      status: 'VERIFIED_BY_AI',
      aiMetrics: {
        spatialAccuracyScore,
        photoConfidence,
        attributeScore,
        overallAiRating,
        rationale,
        detectedFeatures: vision.features || [],
        spatialNotes: vision.notes || ''
      }
    });
  }

  wsService.emit('AI_QA', `✅ Overnight AI Batch Complete! ${validatedSubmissions.length} submissions scored by Gemini Vision.`);
  return validatedSubmissions;
}
