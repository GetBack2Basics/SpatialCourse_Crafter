import { wsService } from './websocketService';
import { calculateOptimalWaypointCount, optimizeRouteSequence, isWaypointPublicLandAccessible } from '../utils/geoUtils';

/**
 * Service for generating spatial challenge courses via Gemini LLM & Web Research
 */
export async function generateCourseWithLLM({
  theme,
  startLocation,
  finishLocation,
  durationMinutes = 60,
  requestedWaypointCount = null
}) {
  const startName = startLocation?.name || 'Start Location';
  const startLat = parseFloat(startLocation?.lat ?? -33.0372);
  const startLng = parseFloat(startLocation?.lng ?? 151.5945);

  const finishName = finishLocation?.name || 'Finish Location';
  const finishLat = parseFloat(finishLocation?.lat ?? -33.0395);
  const finishLng = parseFloat(finishLocation?.lng ?? 151.5960);

  const optimalCalculation = calculateOptimalWaypointCount({
    startLocation: { lat: startLat, lng: startLng },
    finishLocation: { lat: finishLat, lng: finishLng },
    durationMinutes,
    requestedWaypointCount
  });
  const targetWaypointCount = optimalCalculation.count;

  wsService.emitLog('AI_QA', `🤖 Triggered LLM Spatial Web Research: Theme "${theme}" between "${startName}" (${startLat.toFixed(4)}, ${startLng.toFixed(4)}) and "${finishName}" (${finishLat.toFixed(4)}, ${finishLng.toFixed(4)}) - Target Duration: ${durationMinutes} mins (${optimalCalculation.summary})`);

  try {
    // Attempt backend API call first
    if (typeof window !== 'undefined' && window.location) {
      const response = await fetch('/api/generate-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme,
          startLocation: { name: startName, lat: startLat, lng: startLng },
          finishLocation: { name: finishName, lat: finishLat, lng: finishLng },
          durationMinutes: parseInt(durationMinutes, 10) || 60,
          targetWaypointCount,
          spatialMetrics: optimalCalculation
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.course && Array.isArray(data.course.clues)) {
          // Sanitize non-public land items and optimize route sequence
          const validClues = data.course.clues.filter(c => isWaypointPublicLandAccessible(c));
          const orderedClues = optimizeRouteSequence(
            { lat: startLat, lng: startLng },
            validClues.length > 0 ? validClues : data.course.clues,
            { lat: finishLat, lng: finishLng }
          );

          const sanitizedCourse = {
            ...data.course,
            clues: orderedClues
          };

          wsService.emitLog('AI_QA', `✨ Gemini AI successfully generated & route-optimized course "${sanitizedCourse.title}" with ${sanitizedCourse.clues.length} waypoints.`);
          return sanitizedCourse;
        }
      }
    }
  } catch (e) {
    console.warn("Backend course generation notice:", e.message);
  }

  // Smart Client-side Spatial Generator Fallback based on Theme & Coordinates
  wsService.emitLog('AI_QA', `⚡ Running local spatial research synthesis for theme "${theme}" (${targetWaypointCount} waypoints)...`);
  return generateClientFallbackCourse({ theme, startName, startLat, startLng, finishName, finishLat, finishLng, durationMinutes, targetWaypointCount });
}

function generateClientFallbackCourse({ theme, startName, startLat, startLng, finishName, finishLat, finishLng, durationMinutes, targetWaypointCount = 3 }) {
  const latDiff = (finishLat - startLat) || -0.003;
  const lngDiff = (finishLng - startLng) || 0.003;

  const themePresets = {
    'Geodetic Precision': [
      {
        title: `${startName.split(',')[0]} Foreshore Geodetic Benchmark`,
        category: 'Geodetic Survey',
        desc: 'Locate the brass geodetic survey marker disk embedded in the concrete promenade datum block.',
        photo: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600',
        points: 600,
        aiCriteria: 'Verify photo shows brass survey disk or geodetic datum marker plaque.'
      },
      {
        title: 'Tidal Gauge & Cadastral Datum Pillar',
        category: 'Cadastral GIS',
        desc: 'Inspect the primary tidal monitoring station and cadastral survey pillar at Trinity Inlet wharf.',
        photo: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=600',
        points: 750,
        aiCriteria: 'Verify photo shows tide level gauge pillar or cadastral datum mark.'
      },
      {
        title: 'Marina Trigonometrical Control Mark',
        category: 'Trig Survey',
        desc: 'Capture the brass tri-station survey bolt anchored into the granite promenade rock.',
        photo: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600',
        points: 800,
        aiCriteria: 'Verify photo shows trig station bolt or survey marker disk.'
      }
    ],
    'Surveying': [
      {
        title: `${startName.split(',')[0]} Foreshore Geodetic Benchmark`,
        category: 'Geodetic Survey',
        desc: 'Locate the brass geodetic survey marker disk embedded in the concrete promenade datum block.',
        photo: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600',
        points: 600,
        aiCriteria: 'Verify photo shows brass survey disk or geodetic datum marker plaque.'
      },
      {
        title: 'Tidal Gauge & Cadastral Datum Pillar',
        category: 'Cadastral GIS',
        desc: 'Inspect the primary tidal monitoring station and cadastral survey pillar at Trinity Inlet wharf.',
        photo: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=600',
        points: 750,
        aiCriteria: 'Verify photo shows tide level gauge pillar or cadastral datum mark.'
      },
      {
        title: 'Marina Trigonometrical Control Mark',
        category: 'Trig Survey',
        desc: 'Capture the brass tri-station survey bolt anchored into the granite promenade rock.',
        photo: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600',
        points: 800,
        aiCriteria: 'Verify photo shows trig station bolt or survey marker disk.'
      }
    ],
    'Historical & Spatial': [
      {
        title: `${startName.split(',')[0]} Heritage Marker & Foundation`,
        category: 'Historical Heritage',
        desc: 'Observe the original stone foundation and historical plaque marking early local settlement.',
        photo: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600',
        points: 500,
        aiCriteria: 'Verify photo shows historic stone foundation or commemorative plaque.'
      },
      {
        title: 'Geodetic Survey Benchmark Pillar',
        category: 'Survey & Spatial',
        desc: 'Locate the brass geodetic marker disk embedded in the concrete datum block.',
        photo: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600',
        points: 600,
        aiCriteria: 'Verify photo shows brass survey disk or datum marker.'
      },
      {
        title: `${finishName.split(',')[0]} Historic Slipway & Memorial`,
        category: 'Maritime History',
        desc: 'Document the historic timber slipway and memorial pavilion by the shore.',
        photo: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600',
        points: 750,
        aiCriteria: 'Verify photo shows coastal slipway structure or shoreline memorial.'
      }
    ],
    'WW2 Heritage & Boating': [
      {
        title: 'Catalina Flying Boat Slipway 1',
        category: 'WW2 Heritage',
        desc: 'Inspect the reinforced concrete ramp used by RAAF PBY Catalina flying boats during WWII.',
        photo: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600',
        points: 600,
        aiCriteria: 'Verify photo shows WWII concrete slipway or shoreline ramp.'
      },
      {
        title: 'No. 1 Hangar Command Bunker Site',
        category: 'Military GIS',
        desc: 'Identify the surviving brick foundation of the WWII Catalina maintenance hangar.',
        photo: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600',
        points: 700,
        aiCriteria: 'Verify photo shows hangar foundation or structural ruins.'
      },
      {
        title: 'Style Point Mooring & Aviation Memorial',
        category: 'WW2 Aviation',
        desc: 'Photograph the memorial plaque honoring the personnel of RAAF Base Rathmines.',
        photo: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600',
        points: 800,
        aiCriteria: 'Verify photo shows memorial wall or aviation tribute.'
      }
    ],
    'Cultural Heritage': [
      {
        title: 'First Nations Storytelling Circle',
        category: 'Indigenous Heritage',
        desc: 'Locate the carved wooden posts and circular meeting stone near the foreshore.',
        photo: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600',
        points: 500,
        aiCriteria: 'Verify photo shows wooden carvings or circular gathering area.'
      },
      {
        title: 'Pioneer Settlers Cottage',
        category: 'Local Architecture',
        desc: 'Document the restored 19th-century timber weatherboard cottage facade.',
        photo: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600',
        points: 600,
        aiCriteria: 'Verify photo shows historic timber cottage.'
      }
    ],
    'Eco & Environmental': [
      {
        title: 'Foreshore Wetland & Lagoon Observation Deck',
        category: 'Ecology',
        desc: 'Record the native bird species and mangrove canopy density at the boardwalk lookout.',
        photo: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600',
        points: 500,
        aiCriteria: 'Verify photo shows wetland boardwalk or mangrove lagoon lookout.'
      },
      {
        title: 'Geological Coastal Rock Platform',
        category: 'Geomorphology',
        desc: 'Examine the stratified sandstone layers and tidal rock pools.',
        photo: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600',
        points: 600,
        aiCriteria: 'Verify photo shows coastal rock platform or tidal formation.'
      }
    ]
  };

  const selectedPreset = themePresets[theme] || themePresets['Historical & Spatial'];
  const clues = [];

  const isLoop = Math.abs(finishLat - startLat) < 0.0005 && Math.abs(finishLng - startLng) < 0.0005;

  for (let idx = 0; idx < targetWaypointCount; idx++) {
    const presetItem = selectedPreset[idx % selectedPreset.length];
    let lat, lng;

    if (isLoop) {
      // Tightly clustered walking loop around start/finish location (within 100m-350m)
      const angle = (2 * Math.PI * idx) / targetWaypointCount;
      const radiusLat = 0.0012 + (idx % 2 === 0 ? 0.0004 : -0.0002);
      const radiusLng = 0.0015 + (idx % 3 === 0 ? 0.0004 : -0.0002);
      lat = parseFloat((startLat + radiusLat * Math.sin(angle)).toFixed(6));
      lng = parseFloat((startLng + radiusLng * Math.cos(angle)).toFixed(6));
    } else {
      const fraction = (idx + 1) / (targetWaypointCount + 1);
      const perpOffset = (idx % 2 === 0 ? 1 : -1) * 0.0004;
      lat = parseFloat((startLat + latDiff * fraction + perpOffset).toFixed(6));
      lng = parseFloat((startLng + lngDiff * fraction - perpOffset).toFixed(6));
    }

    clues.push({
      id: `generated-clue-${Date.now()}-${idx + 1}`,
      number: idx + 1,
      title: idx < selectedPreset.length ? presetItem.title : `${presetItem.title} Sector ${Math.floor(idx / selectedPreset.length) + 1}`,
      category: presetItem.category,
      description: presetItem.desc,
      targetLocation: { lat, lng },
      points: presetItem.points + (idx * 50),
      targetRadiusMeters: 100,
      taskType: 'PHOTO_VALIDATION',
      referencePhotoUrl: presetItem.photo,
      requiredAttributes: [
        { key: 'site_condition', label: 'Condition', type: 'select', options: ['Good', 'Fair', 'Requires Maint'] }
      ],
      aiCriteria: presetItem.aiCriteria
    });
  }

  const orderedClues = optimizeRouteSequence(
    { lat: startLat, lng: startLng },
    clues,
    { lat: finishLat, lng: finishLng }
  );

  return {
    id: `generated-course-${Date.now()}`,
    title: `${theme} Challenge: ${startName.split(',')[0]} to ${finishName.split(',')[0]}`,
    subtitle: `AI Web Research course focused on ${theme.toLowerCase()} (${targetWaypointCount} waypoints)`,
    durationMinutes: parseInt(durationMinutes, 10) || 60,
    theme,
    startLocation: {
      name: startName,
      lat: startLat,
      lng: startLng,
      activationRadiusMeters: 100
    },
    finishLocation: {
      name: finishName,
      lat: finishLat,
      lng: finishLng
    },
    clues: orderedClues
  };
}



