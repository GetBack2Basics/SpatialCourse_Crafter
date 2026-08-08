/**
 * courseConverter.js
 * Utility to convert raw CSV, GeoJSON, or legacy export data into standardized SpatialCourse JSON schema.
 */

function splitCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map(v => v.replace(/^"|"$/g, '').trim());
}

export function parseCsvToCourse(csvText, courseTitle = "Imported Spatial Course") {
  if (!csvText || typeof csvText !== 'string') {
    throw new Error("Invalid CSV input: Must provide non-empty text content.");
  }

  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error("Invalid CSV input: At least header and one data line required.");
  }

  const headers = splitCsvLine(lines[0]).map(h => h.toLowerCase());
  
  // Find column indices
  const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('title') || h.includes('clue') || h.includes('waypoint'));
  const latIdx = headers.findIndex(h => h.includes('lat') || h.includes('y'));
  const lngIdx = headers.findIndex(h => h.includes('lng') || h.includes('long') || h.includes('x'));
  const categoryIdx = headers.findIndex(h => h.includes('cat'));
  const pointsIdx = headers.findIndex(h => h.includes('point') || h.includes('score'));
  const descIdx = headers.findIndex(h => h.includes('desc') || h.includes('info') || h.includes('clue'));
  const radiusIdx = headers.findIndex(h => h.includes('radius') || h.includes('dist'));
  const groupPhotoIdx = headers.findIndex(h => h.includes('photo') || h.includes('group'));
  const maskIdx = headers.findIndex(h => h.includes('mask') || h.includes('hide'));

  if (latIdx === -1 || lngIdx === -1) {
    throw new Error("CSV missing mandatory latitude and longitude columns.");
  }

  const categoriesSet = new Set(["Geospatial", "Historical", "Environment"]);

  const clues = [];
  let lineCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cleanVals = splitCsvLine(line);

    const lat = parseFloat(cleanVals[latIdx]);
    const lng = parseFloat(cleanVals[lngIdx]);

    if (isNaN(lat) || isNaN(lng)) continue;

    lineCount++;
    const clueTitle = nameIdx !== -1 && cleanVals[nameIdx] ? cleanVals[nameIdx] : `Waypoint #${lineCount}`;
    const category = categoryIdx !== -1 && cleanVals[categoryIdx] ? cleanVals[categoryIdx] : "Geospatial";
    const points = pointsIdx !== -1 && !isNaN(parseInt(cleanVals[pointsIdx])) ? parseInt(cleanVals[pointsIdx]) : 100;
    const description = descIdx !== -1 && cleanVals[descIdx] ? cleanVals[descIdx] : `Find and inspect spatial waypoint ${clueTitle}`;
    const radius = radiusIdx !== -1 && !isNaN(parseInt(cleanVals[radiusIdx])) ? parseInt(cleanVals[radiusIdx]) : 30;
    const requiresGroupPhoto = groupPhotoIdx !== -1 ? ['true', 'yes', '1'].includes(cleanVals[groupPhotoIdx]?.toLowerCase()) : true;
    const maskCoordinates = maskIdx !== -1 ? ['true', 'yes', '1'].includes(cleanVals[maskIdx]?.toLowerCase()) : false;

    categoriesSet.add(category);

    clues.push({
      id: `clue-imp-${Date.now()}-${lineCount}`,
      number: lineCount,
      title: clueTitle,
      category,
      description,
      targetLocation: { lat, lng },
      points,
      targetRadiusMeters: radius,
      maskCoordinates,
      requiresGroupPhoto,
      taskType: "POINT_CAPTURE",
      requiredAttributes: [
        { key: "status", label: "Condition Status", type: "select", options: ["Good", "Requires Repair", "Not Found"] }
      ],
      aiCriteria: `Verify location photo and team presence at ${lat.toFixed(4)}, ${lng.toFixed(4)}`
    });
  }

  if (clues.length === 0) {
    throw new Error("No valid spatial coordinates could be extracted from the CSV file.");
  }

  const firstClue = clues[0];
  const lastClue = clues[clues.length - 1];

  return {
    id: `course-imp-${Date.now()}`,
    title: courseTitle,
    subtitle: `Imported course with ${clues.length} spatial waypoints`,
    durationMinutes: 60,
    theme: "Imported Challenge",
    startLocation: {
      name: `Start: ${firstClue.title}`,
      lat: firstClue.targetLocation.lat,
      lng: firstClue.targetLocation.lng,
      activationRadiusMeters: 50
    },
    finishLocation: {
      name: `Finish: ${lastClue.title}`,
      lat: lastClue.targetLocation.lat,
      lng: lastClue.targetLocation.lng
    },
    categories: Array.from(categoriesSet),
    clues
  };
}

export function parseGeoJsonToCourse(geoJsonData, courseTitle = "Imported GeoJSON Course") {
  const geoObj = typeof geoJsonData === 'string' ? JSON.parse(geoJsonData) : geoJsonData;
  if (!geoObj || geoObj.type !== 'FeatureCollection' || !Array.isArray(geoObj.features)) {
    throw new Error("Invalid GeoJSON: Must be a valid FeatureCollection.");
  }

  const categoriesSet = new Set(["Geospatial", "Historical"]);
  const clues = [];
  let count = 0;

  geoObj.features.forEach((feature) => {
    if (feature.geometry && feature.geometry.type === 'Point' && Array.isArray(feature.geometry.coordinates)) {
      count++;
      const [lng, lat] = feature.geometry.coordinates;
      const props = feature.properties || {};

      const title = props.name || props.title || `POI #${count}`;
      const category = props.category || props.type || "Geospatial";
      const points = props.points || props.score || 100;
      const description = props.description || props.desc || `Inspect location target for ${title}`;
      const radius = props.radius || 35;
      const maskCoordinates = Boolean(props.maskCoordinates || props.hideLocation);
      const requiresGroupPhoto = props.requiresGroupPhoto !== undefined ? Boolean(props.requiresGroupPhoto) : true;

      categoriesSet.add(category);

      clues.push({
        id: `clue-gj-${Date.now()}-${count}`,
        number: count,
        title,
        category,
        description,
        targetLocation: { lat, lng },
        points,
        targetRadiusMeters: radius,
        maskCoordinates,
        requiresGroupPhoto,
        taskType: "POINT_CAPTURE",
        requiredAttributes: [
          { key: "notes", label: "Field Notes", type: "text" }
        ],
        aiCriteria: `Verify location photo at target coordinates.`
      });
    }
  });

  if (clues.length === 0) {
    throw new Error("GeoJSON contains no valid Point features.");
  }

  const start = clues[0];
  const finish = clues[clues.length - 1];

  return {
    id: `course-gj-${Date.now()}`,
    title: courseTitle,
    subtitle: `Imported GeoJSON course with ${clues.length} waypoints`,
    durationMinutes: 60,
    theme: "GeoJSON Challenge",
    startLocation: {
      name: start.title,
      lat: start.targetLocation.lat,
      lng: start.targetLocation.lng,
      activationRadiusMeters: 50
    },
    finishLocation: {
      name: finish.title,
      lat: finish.targetLocation.lat,
      lng: finish.targetLocation.lng
    },
    categories: Array.from(categoriesSet),
    clues
  };
}

export function validateCourseSchema(course) {
  if (!course || typeof course !== 'object') return false;
  if (!course.id || !course.title || !Array.isArray(course.clues)) return false;
  if (course.clues.length === 0) return false;

  return course.clues.every(clue => 
    clue.id &&
    clue.title &&
    clue.targetLocation &&
    typeof clue.targetLocation.lat === 'number' &&
    typeof clue.targetLocation.lng === 'number'
  );
}
