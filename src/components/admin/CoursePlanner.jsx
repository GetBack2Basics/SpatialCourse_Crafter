import React, { useState, useEffect, useMemo, useRef } from 'react';
import MapLibreView from '../map/MapLibreView';
import MapLocationPicker from '../map/MapLocationPicker';
import { wsService } from '../../services/websocketService';
import { authService } from '../../services/authService';
import { calculateHaversineDistance, parseCoordinates, getWaypointLabel, calculateOptimalWaypointCount, optimizeRouteSequence } from '../../utils/geoUtils';
import { generateCourseWithLLM } from '../../services/courseGeneratorService';

export default function CoursePlanner({
  course,
  courses,
  selectedCourseId,
  onSelectCourse,
  onCreateNewCourse,
  onUpdateCourse,
  onDeleteCourse
}) {
  const [, setAuthTick] = useState(0);
  useEffect(() => {
    return authService.subscribe(() => setAuthTick(t => t + 1));
  }, []);
  const [title, setTitle] = useState(course.title);
  const [duration, setDuration] = useState(course.durationMinutes);
  const [theme, setTheme] = useState(course.theme);
  const [startName, setStartName] = useState(course.startLocation?.name || '');
  const [startLat, setStartLat] = useState(course.startLocation?.lat ?? -33.0372);
  const [startLng, setStartLng] = useState(course.startLocation?.lng ?? 151.5945);
  const [activationRadius, setActivationRadius] = useState(course.startLocation?.activationRadiusMeters ?? 100);

  const [finishName, setFinishName] = useState(course.finishLocation?.name || '');
  const [finishLat, setFinishLat] = useState(course.finishLocation?.lat ?? -33.0395);
  const [finishLng, setFinishLng] = useState(course.finishLocation?.lng ?? 151.5960);

  // Quick Paste raw coordinates / maps link state
  const [rawCoordText, setRawCoordText] = useState('');
  const [parsedNotice, setParsedNotice] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  // Collapsible parser and location autocomplete state
  const [isParserOpen, setIsParserOpen] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Finish location autocomplete state
  const [finishLocationSuggestions, setFinishLocationSuggestions] = useState([]);
  const [showFinishSuggestions, setShowFinishSuggestions] = useState(false);

  // Active clue selection state for map zoom sync
  const [activeClueId, setActiveClueId] = useState(course.clues[0]?.id || null);

  // Movable & Collapsible Spatial Analysis Overlay Card State
  const [isAnalysisCollapsed, setIsAnalysisCollapsed] = useState(false);
  const [cardPos, setCardPos] = useState({ x: 24, y: 24 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const posStartRef = useRef({ x: 24, y: 24 });

  const handleAnalysisMouseDown = (e) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    posStartRef.current = { ...cardPos };

    const handleMouseMove = (ev) => {
      if (!isDraggingRef.current) return;
      const dx = ev.clientX - dragStartRef.current.x;
      const dy = ev.clientY - dragStartRef.current.y;
      setCardPos({
        x: Math.max(10, posStartRef.current.x + dx),
        y: Math.max(10, posStartRef.current.y + dy)
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Editing clue modal state
  const [editingClue, setEditingClue] = useState(null);

  // Sync state whenever selected course changes
  useEffect(() => {
    setTitle(course.title);
    setDuration(course.durationMinutes);
    setTheme(course.theme);
    setStartName(course.startLocation?.name || '');
    setStartLat(course.startLocation?.lat ?? -33.0372);
    setStartLng(course.startLocation?.lng ?? 151.5945);
    setActivationRadius(course.startLocation?.activationRadiusMeters ?? 100);
    setFinishName(course.finishLocation?.name || '');
    setFinishLat(course.finishLocation?.lat ?? -33.0395);
    setFinishLng(course.finishLocation?.lng ?? 151.5960);
    setRawCoordText('');
    setParsedNotice(null);
    setShowSuggestions(false);
  }, [course]);

  // Location search & autofill strictly biased to user's region/state/country first
  useEffect(() => {
    if (!startName || startName.trim().length < 3) {
      setLocationSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const centerLat = parseFloat(startLat) || -33.0372;
      const centerLng = parseFloat(startLng) || 151.5945;
      
      // Nominatim viewbox format: <left>,<top>,<right>,<bottom> (xmin, ymax, xmax, ymin)
      const xmin = (centerLng - 3.0).toFixed(4);
      const ymax = (centerLat + 3.0).toFixed(4);
      const xmax = (centerLng + 3.0).toFixed(4);
      const ymin = (centerLat - 3.0).toFixed(4);
      const viewboxStr = `${xmin},${ymax},${xmax},${ymin}`;

      try {
        // Stage 1: Try bounded=1 local regional search first
        let res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(startName)}&viewbox=${viewboxStr}&bounded=1&limit=5`);
        let data = [];
        if (res.ok) data = await res.json();

        // Stage 2: If no results in local region, fallback to bounded=0
        if (!data || data.length === 0) {
          res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(startName)}&viewbox=${viewboxStr}&bounded=0&limit=5`);
          if (res.ok) data = await res.json();
        }

        const formatted = data.map(item => ({
          display_name: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          state: item.address?.state || item.address?.region || '',
          country: item.address?.country || ''
        }));
        setLocationSuggestions(formatted);
      } catch (e) {
        console.warn("Geocoding lookup notice:", e);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [startName, startLat, startLng]);

  // Location search & autofill strictly biased to user's region/state/country first
  useEffect(() => {
    if (!finishName || finishName.trim().length < 3) {
      setFinishLocationSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const centerLat = parseFloat(startLat) || -33.0372;
      const centerLng = parseFloat(startLng) || 151.5945;

      // Nominatim viewbox format: <left>,<top>,<right>,<bottom> (xmin, ymax, xmax, ymin)
      const xmin = (centerLng - 3.0).toFixed(4);
      const ymax = (centerLat + 3.0).toFixed(4);
      const xmax = (centerLng + 3.0).toFixed(4);
      const ymin = (centerLat - 3.0).toFixed(4);
      const viewboxStr = `${xmin},${ymax},${xmax},${ymin}`;

      try {
        // Stage 1: Try bounded=1 local regional search first
        let res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(finishName)}&viewbox=${viewboxStr}&bounded=1&limit=5`);
        let data = [];
        if (res.ok) data = await res.json();

        // Stage 2: If no results in local region, fallback to bounded=0
        if (!data || data.length === 0) {
          res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(finishName)}&viewbox=${viewboxStr}&bounded=0&limit=5`);
          if (res.ok) data = await res.json();
        }

        const formatted = data.map(item => ({
          display_name: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          state: item.address?.state || item.address?.region || '',
          country: item.address?.country || ''
        }));
        setFinishLocationSuggestions(formatted);
      } catch (e) {
        console.warn("Finish geocoding lookup notice:", e);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [finishName, startLat, startLng]);

  // Move Clue Up or Down in order
  const handleMoveClue = (clueId, direction) => {
    const index = course.clues.findIndex(c => c.id === clueId);
    if (index === -1) return;

    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= course.clues.length) return;

    const newClues = [...course.clues];
    const [moved] = newClues.splice(index, 1);
    newClues.splice(targetIndex, 0, moved);

    // Re-index clue numbers
    const reindexedClues = newClues.map((c, i) => ({ ...c, number: i + 1 }));

    onUpdateCourse({ ...course, clues: reindexedClues });
    wsService.emitLog('SYSTEM', `Reordered Waypoint #${moved.number} ${direction === 'UP' ? 'up' : 'down'} to position #${targetIndex + 1}`);
    showToast(`↔️ Waypoint #${moved.number} moved to position #${targetIndex + 1}!`);
  };

  // Auto-optimize Route Sequence Order (Start -> Waypoints -> Finish)
  const handleOptimizeRouteOrder = () => {
    if (!course || !course.clues || course.clues.length <= 1) return;
    const sorted = optimizeRouteSequence(
      { lat: parseFloat(startLat), lng: parseFloat(startLng) },
      course.clues,
      { lat: parseFloat(finishLat), lng: parseFloat(finishLng) }
    );
    onUpdateCourse({ ...course, clues: sorted });
    wsService.emitLog('SPATIAL', `Auto-sorted ${sorted.length} waypoints into optimal start-to-finish physical route sequence.`);
    showToast(`🗺️ Auto-sorted waypoints into optimal start-to-finish physical route sequence!`);
  };

  // Delete Clue
  const handleDeleteClue = (clueId) => {
    const clueToDelete = course.clues.find(c => c.id === clueId);
    const filtered = course.clues.filter(c => c.id !== clueId);
    const reindexedClues = filtered.map((c, i) => ({ ...c, number: i + 1 }));

    onUpdateCourse({ ...course, clues: reindexedClues });
    wsService.emitLog('SYSTEM', `Deleted Waypoint: "${clueToDelete?.title || clueId}"`);
    showToast(`🗑️ Waypoint deleted successfully!`);
  };

  // Update clue coordinates when marker is dragged on map
  const handleUpdateClueLocation = (clueId, newLocation) => {
    const updatedClues = course.clues.map(c => 
      c.id === clueId ? { ...c, targetLocation: newLocation } : c
    );
    onUpdateCourse({ ...course, clues: updatedClues });
    setEditingClue(prev => (prev && prev.id === clueId ? { ...prev, targetLocation: newLocation } : prev));
    wsService.emitLog('SPATIAL', `Waypoint #${clueId} marker dragged on map to: ${newLocation.lat}, ${newLocation.lng}`);
    showToast(`📍 Waypoint position updated on map!`);
  };

  // Update start location when start marker is dragged on map
  const handleUpdateStartLocation = (newLocation) => {
    setStartLat(newLocation.lat);
    setStartLng(newLocation.lng);
    onUpdateCourse({
      ...course,
      startLocation: {
        ...course.startLocation,
        name: startName,
        lat: newLocation.lat,
        lng: newLocation.lng,
        activationRadiusMeters: parseInt(activationRadius, 10) || 100
      }
    });
    wsService.emitLog('SPATIAL', `Start location marker dragged on map to: ${newLocation.lat}, ${newLocation.lng}`);
    showToast(`🚩 Start location moved on map to: ${newLocation.lat}°, ${newLocation.lng}°`);
  };

  // Update finish location when finish marker is dragged on map
  const handleUpdateFinishLocation = (newLocation) => {
    setFinishLat(newLocation.lat);
    setFinishLng(newLocation.lng);
    onUpdateCourse({
      ...course,
      finishLocation: {
        ...course.finishLocation,
        name: finishName,
        lat: newLocation.lat,
        lng: newLocation.lng
      }
    });
    wsService.emitLog('SPATIAL', `Finish location marker dragged on map to: ${newLocation.lat}, ${newLocation.lng}`);
    showToast(`🏁 Finish location moved on map to: ${newLocation.lat}°, ${newLocation.lng}°`);
  };

  // Save edited clue from Edit Waypoint modal
  const handleSaveEditClue = (e) => {
    e.preventDefault();
    if (!editingClue) return;

    const updatedClues = course.clues.map(c => 
      c.id === editingClue.id ? editingClue : c
    );
    onUpdateCourse({ ...course, clues: updatedClues });
    wsService.emitLog('SYSTEM', `Edited Waypoint #${editingClue.number}: "${editingClue.title}"`);
    showToast(`✏️ Waypoint #${editingClue.number} "${editingClue.title}" saved!`);
    setEditingClue(null);
  };

  // Phone Current GPS Location Handler
  const handleUsePhoneGPS = () => {
    if (!navigator.geolocation) {
      showToast("❌ Geolocation is not supported by your browser.", "error");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setStartLat(lat);
        setStartLng(lng);
        setStartName("Phone Device GPS Location");
        setIsLocating(false);

        wsService.emitLog('SPATIAL', `Start Location set from Phone GPS: ${lat}, ${lng} (±${Math.round(pos.coords.accuracy)}m accuracy)`);
        showToast(`📍 Start location set from phone GPS: ${lat}°, ${lng}° (±${Math.round(pos.coords.accuracy)}m)!`);
      },
      (err) => {
        setIsLocating(false);
        showToast(`⚠️ Could not retrieve phone location: ${err.message}`, "error");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Quick Paste Coordinates / Google Maps Link Handler
  const handleRawCoordChange = (text) => {
    setRawCoordText(text);
    if (!text.trim()) {
      setParsedNotice(null);
      return;
    }

    const coords = parseCoordinates(text);
    if (coords) {
      setStartLat(coords.lat);
      setStartLng(coords.lng);
      setParsedNotice(`✅ Valid coordinates parsed: ${coords.lat}°, ${coords.lng}°`);
      wsService.emitLog('SPATIAL', `Parsed coordinates from raw text/link: ${coords.lat}, ${coords.lng}`);
    } else {
      setParsedNotice(`⚠️ Could not recognize coordinates. Paste "-33.0372, 151.5945", Google Maps URL, or GPS text.`);
    }
  };

  const [customWaypointCount, setCustomWaypointCount] = useState('');

  // Calculate optimal waypoint count based on duration, start & finish points, 5 mins stay, walking pace + incline
  const optimalWaypointMetrics = useMemo(() => {
    return calculateOptimalWaypointCount({
      startLocation: { lat: parseFloat(startLat), lng: parseFloat(startLng) },
      finishLocation: { lat: parseFloat(finishLat), lng: parseFloat(finishLng) },
      durationMinutes: parseInt(duration, 10) || 60,
      timePerWaypointMinutes: 5,
      walkingSpeedKmH: 4.8,
      requestedWaypointCount: customWaypointCount
    });
  }, [startLat, startLng, finishLat, finishLng, duration, customWaypointCount]);

  // Dynamically calculate Spatial Analysis metrics based on Start/Finish Location & Waypoints
  const courseMetrics = useMemo(() => {
    if (!course || !course.clues || course.clues.length === 0) {
      return { totalDistanceKm: '0.8 km', estTime: '25m', count: 0 };
    }

    let totalMeters = 0;
    let curr = { lat: parseFloat(startLat) || course.startLocation.lat, lng: parseFloat(startLng) || course.startLocation.lng };

    course.clues.forEach(clue => {
      totalMeters += calculateHaversineDistance(curr.lat, curr.lng, clue.targetLocation.lat, clue.targetLocation.lng);
      curr = { lat: clue.targetLocation.lat, lng: clue.targetLocation.lng };
    });

    // Add return segment if finish location is specified
    const currentFinishLat = parseFloat(finishLat) || course.finishLocation?.lat;
    const currentFinishLng = parseFloat(finishLng) || course.finishLocation?.lng;
    if (currentFinishLat && currentFinishLng) {
      totalMeters += calculateHaversineDistance(curr.lat, curr.lng, currentFinishLat, currentFinishLng);
    }

    const totalKm = (totalMeters / 1000).toFixed(1);
    const walkMinutes = Math.round((totalMeters / 1000) / 4.5 * 60);
    const taskMinutes = course.clues.length * 12;
    const totalMinutes = walkMinutes + taskMinutes;

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const estTimeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    return {
      totalDistanceKm: `${totalKm} km`,
      estTime: estTimeStr,
      count: course.clues.length
    };
  }, [course, startLat, startLng, finishLat, finishLng]);

  // Notification Toast State
  const [toastMessage, setToastMessage] = useState(null);

  // New clue modal state
  const [isAddingClue, setIsAddingClue] = useState(false);
  const [newClueTitle, setNewClueTitle] = useState('');
  const [newClueCategory, setNewClueCategory] = useState('WW2 Heritage & Boating');
  const [newClueDesc, setNewClueDesc] = useState('');
  const [newClueLat, setNewClueLat] = useState(course.startLocation?.lat - 0.0012 || -33.0384);
  const [newClueLng, setNewClueLng] = useState(course.startLocation?.lng + 0.0015 || 151.5960);
  const [newClueRadius, setNewClueRadius] = useState(50);
  const [newCluePhotoUrl, setNewCluePhotoUrl] = useState('');

  // JSON Import & Export Modal State
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [jsonInputText, setJsonInputText] = useState('');
  const [jsonModalPos, setJsonModalPos] = useState({ x: 0, y: 0 });
  const isJsonModalDraggingRef = useRef(false);
  const jsonModalDragStartRef = useRef({ x: 0, y: 0 });
  const jsonModalPosStartRef = useRef({ x: 0, y: 0 });

  const handleJsonModalMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea')) return;

    isJsonModalDraggingRef.current = true;
    jsonModalDragStartRef.current = { x: e.clientX, y: e.clientY };
    jsonModalPosStartRef.current = { ...jsonModalPos };

    const handleMouseMove = (ev) => {
      if (!isJsonModalDraggingRef.current) return;
      const dx = ev.clientX - jsonModalDragStartRef.current.x;
      const dy = ev.clientY - jsonModalDragStartRef.current.y;
      setJsonModalPos({
        x: jsonModalPosStartRef.current.x + dx,
        y: jsonModalPosStartRef.current.y + dy
      });
    };

    const handleMouseUp = () => {
      isJsonModalDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Dynamic Themes State & AI Web Research Generation State
  const [availableThemes, setAvailableThemes] = useState([
    { name: 'WW2 Heritage & Boating', icon: 'flight_takeoff', desc: 'RAAF Catalina bases, historic slipways, and military heritage.' },
    { name: 'Historical & Spatial', icon: 'history_edu', desc: 'Focus on historical progression across geographic zones.' },
    { name: 'Cultural Heritage', icon: 'temple_buddhist', desc: 'Sites of profound cultural and societal impact.' },
    { name: 'Eco & Environmental', icon: 'eco', desc: 'Natural reserves, topographies, and conservation zones.' },
    { name: 'Geodetic Precision', icon: 'satellite_alt', desc: 'High-accuracy surveying marks and geospatial anchors.' }
  ]);
  const [customThemeInput, setCustomThemeInput] = useState('');
  const [isGeneratingCourse, setIsGeneratingCourse] = useState(false);
  const [editingThemeItem, setEditingThemeItem] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Export Course JSON Handler
  const handleExportJson = (courseToExport) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(courseToExport, null, 2));
    const downloadAnchor = document.createElement('a');
    const filename = `spatial-course-${courseToExport.id || 'export'}-${Date.now()}.json`;
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`📥 Exported course JSON file "${filename}"!`);
    wsService.emitLog('SYSTEM', `Exported Course JSON for "${courseToExport.title}" (${courseToExport.clues.length} waypoints).`);
  };

  // Import Course JSON Handler
  const importCourseFromJson = (jsonText) => {
    try {
      const parsed = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;

      if (!parsed || typeof parsed !== 'object') {
        throw new Error("Invalid JSON structure.");
      }

      if (!parsed.title || !Array.isArray(parsed.clues)) {
        throw new Error("JSON must contain at least 'title' and a 'clues' array.");
      }

      // Sanitize and re-index clues
      const sanitizedClues = parsed.clues.map((c, idx) => ({
        id: c.id || `clue-${Date.now()}-${idx + 1}`,
        number: idx + 1,
        title: c.title || `Waypoint #${idx + 1}`,
        category: c.category || 'Geospatial',
        description: c.description || '',
        targetLocation: {
          lat: parseFloat(c.targetLocation?.lat ?? c.lat ?? -33.0372),
          lng: parseFloat(c.targetLocation?.lng ?? c.lng ?? 151.5945)
        },
        points: parseInt(c.points, 10) || 500,
        targetRadiusMeters: parseInt(c.targetRadiusMeters, 10) || 100,
        taskType: c.taskType || 'PHOTO_VALIDATION',
        referencePhotoUrl: c.referencePhotoUrl || '',
        requiredAttributes: Array.isArray(c.requiredAttributes) ? c.requiredAttributes : [],
        aiCriteria: c.aiCriteria || 'Verify photo matches waypoint feature at target location.'
      }));

      const importedCourse = {
        id: parsed.id || `imported-course-${Date.now()}`,
        title: parsed.title,
        subtitle: parsed.subtitle || 'Imported Spatial Challenge',
        durationMinutes: parseInt(parsed.durationMinutes, 10) || 60,
        theme: parsed.theme || 'Custom GIS',
        startLocation: {
          name: parsed.startLocation?.name || 'Course Start Point',
          lat: parseFloat(parsed.startLocation?.lat ?? -33.0360),
          lng: parseFloat(parsed.startLocation?.lng ?? 151.5930),
          activationRadiusMeters: parseInt(parsed.startLocation?.activationRadiusMeters, 10) || 100
        },
        finishLocation: {
          name: parsed.finishLocation?.name || 'Course Finish Point',
          lat: parseFloat(parsed.finishLocation?.lat ?? -33.0395),
          lng: parseFloat(parsed.finishLocation?.lng ?? 151.5960)
        },
        clues: sanitizedClues
      };

      onUpdateCourse(importedCourse);
      showToast(`✅ Imported course "${importedCourse.title}" with ${sanitizedClues.length} waypoints!`);
      wsService.emitLog('SYSTEM', `Imported course JSON: "${importedCourse.title}" with ${sanitizedClues.length} waypoints.`);
      return true;
    } catch (err) {
      showToast(`❌ Failed to import course JSON: ${err.message}`, 'error');
      return false;
    }
  };

  // Add Custom Theme Handler
  const handleAddCustomTheme = (e) => {
    e.preventDefault();
    if (!customThemeInput || !customThemeInput.trim()) return;

    const trimmed = customThemeInput.trim();
    if (availableThemes.some(t => t.name.toLowerCase() === trimmed.toLowerCase())) {
      setTheme(trimmed);
      setCustomThemeInput('');
      return;
    }

    const newThemeObj = {
      name: trimmed,
      icon: 'auto_awesome',
      desc: `Custom spatial theme: "${trimmed}"`
    };

    setAvailableThemes([...availableThemes, newThemeObj]);
    setTheme(trimmed);
    setCustomThemeInput('');
    showToast(`✨ Added custom theme: "${trimmed}"!`);
    wsService.emitLog('SYSTEM', `Admin added custom theme: "${trimmed}"`);
  };

  // Generate Course via Gemini LLM & Web Research
  const handleGenerateCourseWithAI = async (selectedTheme = theme) => {
    setIsGeneratingCourse(true);
    showToast(`🤖 Gemini AI Web Researching landmarks for theme "${selectedTheme}"...`, 'info');

    try {
      const generated = await generateCourseWithLLM({
        theme: selectedTheme,
        startLocation: { name: startName, lat: parseFloat(startLat), lng: parseFloat(startLng) },
        finishLocation: { name: finishName, lat: parseFloat(finishLat), lng: parseFloat(finishLng) },
        durationMinutes: parseInt(duration, 10) || 60,
        requestedWaypointCount: customWaypointCount
      });

      if (generated && generated.clues) {
        setTitle(generated.title);
        setTheme(selectedTheme);
        onUpdateCourse(generated);
        showToast(`✨ Generated AI course "${generated.title}" with ${generated.clues.length} waypoints!`);
      }
    } catch (err) {
      showToast(`❌ Course generation error: ${err.message}`, 'error');
    } finally {
      setIsGeneratingCourse(false);
    }
  };

  const handleSaveCourse = async () => {
    const updatedCourse = {
      ...course,
      title,
      durationMinutes: parseInt(duration, 10),
      theme,
      startLocation: {
        ...course.startLocation,
        name: startName,
        lat: parseFloat(startLat) || 0,
        lng: parseFloat(startLng) || 0,
        activationRadiusMeters: parseInt(activationRadius, 10) || 100
      },
      finishLocation: {
        ...course.finishLocation,
        name: finishName,
        lat: parseFloat(finishLat) || 0,
        lng: parseFloat(finishLng) || 0
      }
    };

    onUpdateCourse(updatedCourse);

    try {
      await fetch('/api/course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCourse)
      });
    } catch (e) {
      console.warn("Backend save notice:", e.message);
    }

    wsService.emitLog('SYSTEM', `Course Published: "${title}" (${duration} mins, Start Lat/Lng: ${startLat}, ${startLng}, Activation Radius: ${activationRadius}m)`);
    showToast(`✅ Course "${title}" successfully saved & published!`);
  };

  const handleDiscardDraft = () => {
    setTitle(course.title);
    setDuration(course.durationMinutes);
    setTheme(course.theme);
    setStartName(course.startLocation?.name || '');
    setStartLat(course.startLocation?.lat ?? -33.0372);
    setStartLng(course.startLocation?.lng ?? 151.5945);
    setActivationRadius(course.startLocation?.activationRadiusMeters ?? 100);
    setFinishName(course.finishLocation?.name || '');
    setFinishLat(course.finishLocation?.lat ?? -33.0395);
    setFinishLng(course.finishLocation?.lng ?? 151.5960);

    wsService.emitLog('SYSTEM', `Draft discarded for course "${course.title}". Reset to last saved state.`);
    showToast(`🔄 Draft discarded. Reset to last saved state.`, 'info');
  };

  const handleCreateClue = (e) => {
    e.preventDefault();
    if (!newClueTitle) return;

    const newClue = {
      id: `clue-${Date.now()}`,
      number: course.clues.length + 1,
      title: newClueTitle,
      category: newClueCategory,
      description: newClueDesc || 'Custom waypoint added to course',
      targetLocation: { lat: parseFloat(newClueLat), lng: parseFloat(newClueLng) },
      points: 500,
      targetRadiusMeters: parseInt(newClueRadius, 10) || 100,
      taskType: 'PHOTO_VALIDATION',
      referencePhotoUrl: newCluePhotoUrl || 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600',
      requiredAttributes: [
        { key: 'site_condition', label: 'Condition', type: 'select', options: ['Good', 'Fair', 'Requires Maint'] }
      ],
      aiCriteria: 'Verify photo matches waypoint feature at target location.'
    };

    const updatedClues = [...course.clues, newClue];
    onUpdateCourse({
      ...course,
      clues: updatedClues
    });

    wsService.emitLog('SYSTEM', `Added Waypoint #${newClue.number}: "${newClueTitle}" (${newClueCategory}, Radius: ${newClue.targetRadiusMeters}m)`);
    showToast(`📍 Waypoint #${newClue.number} "${newClueTitle}" added with ${newClue.targetRadiusMeters}m radius!`);

    setIsAddingClue(false);
    setNewClueTitle('');
    setNewClueDesc('');
    setNewClueRadius(100);
    setNewCluePhotoUrl('');
  };

  return (
    <div className="flex flex-col w-full h-full relative" style={{ minHeight: 'calc(100vh - 4rem)' }}>
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl font-mono text-xs border transition-all animate-in fade-in duration-300 ${
          toastMessage.type === 'success'
            ? 'bg-primary-container text-on-primary-container border-primary'
            : 'bg-surface-container-high text-on-surface border-outline-variant'
        }`}>
          {toastMessage.text}
        </div>
      )}

      {/* Top actions bar with Course Selector & New Course controls */}
      <div className="w-full bg-surface-container-lowest shadow-sm z-10 px-4 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle">
        
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Spatial Olympics Course Wizard</h1>
          <p className="font-body-md text-body-md text-text-secondary mt-1">Design and configure geo-spatial challenges.</p>
        </div>

        {/* Course Selector & New Course Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-container rounded-full px-3 py-1.5 border border-border-subtle shadow-sm">
            <span className="material-symbols-outlined text-primary text-sm">map</span>
            <select
              value={selectedCourseId}
              onChange={e => onSelectCourse(e.target.value)}
              className="bg-transparent text-xs font-bold text-on-surface focus:outline-none cursor-pointer"
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onCreateNewCourse}
            className="h-9 px-4 rounded-full font-label-md text-xs bg-secondary-container text-on-secondary-container hover:bg-secondary/20 transition-all font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            New Course
          </button>

          {/* JSON Export, File Import & Studio Editor Controls */}
          <button
            type="button"
            onClick={() => handleExportJson(course)}
            title="Export course details as JSON file"
            className="h-9 px-3 rounded-full font-label-md text-xs bg-surface-container hover:bg-surface-container-high text-on-surface border border-border-subtle transition-all font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm font-mono"
          >
            <span className="material-symbols-outlined text-sm text-cyan-400">download</span>
            <span>Export JSON</span>
          </button>

          <label
            title="Import course details from JSON file"
            className="h-9 px-3 rounded-full font-label-md text-xs bg-surface-container hover:bg-surface-container-high text-on-surface border border-border-subtle transition-all font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm font-mono"
          >
            <span className="material-symbols-outlined text-sm text-emerald-400">upload_file</span>
            <span>Import JSON</span>
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={e => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  importCourseFromJson(ev.target.result);
                };
                reader.readAsText(file);
                e.target.value = '';
              }}
            />
          </label>

          <button
            type="button"
            onClick={() => {
              setJsonInputText(JSON.stringify(course, null, 2));
              setJsonModalPos({ x: 0, y: 0 });
              setIsJsonModalOpen(true);
            }}
            title="View / Edit Raw Course JSON Studio"
            className="h-9 px-3 rounded-full font-label-md text-xs bg-surface-container hover:bg-surface-container-high text-on-surface border border-border-subtle transition-all font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm font-mono"
          >
            <span className="material-symbols-outlined text-sm text-amber-400">code</span>
            <span>JSON Studio</span>
          </button>

          {onDeleteCourse && courses.length > 1 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete course "${title}"?`)) {
                  onDeleteCourse(course.id);
                  showToast(`🗑️ Deleted course "${title}"`);
                }
              }}
              className="h-9 px-3.5 rounded-full font-label-md text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-sm"
              title="Delete Current Course"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              <span>Delete</span>
            </button>
          )}

          <button
            onClick={handleDiscardDraft}
            className="h-9 px-4 rounded-full font-label-md text-xs bg-surface text-primary border border-primary transition-all hover:bg-primary-container hover:text-on-primary-container uppercase tracking-wide cursor-pointer"
          >
            Discard
          </button>
          
          <button
            onClick={handleSaveCourse}
            className="h-9 px-5 rounded-full font-label-md text-xs bg-primary text-on-primary shadow-md transition-all hover:bg-surface-tint hover:shadow-lg uppercase tracking-wide flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">save</span>
            Save Course
          </button>
        </div>

      </div>

      {/* Main Content Area: Split Layout from Stitch code.html */}
      <div className="flex-1 flex flex-col lg:flex-row w-full overflow-hidden">
        
        {/* LEFT COLUMN: Course Parameters & Clues */}
        <div className="w-full lg:w-[45%] flex flex-col overflow-y-auto bg-surface relative z-10 custom-scrollbar pb-24 lg:pb-0">
          <div className="p-margin-mobile lg:p-margin-desktop space-y-12">
            
            {/* Section: Course Parameters */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-label-sm font-bold">01</div>
                <h2 className="font-headline-md text-headline-md text-on-surface">Course Parameters</h2>
              </div>

              <div className="space-y-6">
                <div className="relative group">
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-2 uppercase">Course Title</label>
                  <input
                    className="w-full bg-surface-container-lowest rounded-lg py-3 px-4 font-body-lg text-body-lg text-on-surface border border-border-subtle focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="relative group">
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-2 uppercase">Duration (mins)</label>
                    <div className="relative">
                      <input
                        className="w-full bg-surface-container-lowest rounded-lg py-3 pl-12 pr-4 font-body-lg text-body-lg text-on-surface border border-border-subtle focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm font-mono"
                        type="number"
                        value={duration}
                        onChange={e => setDuration(e.target.value)}
                      />
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">timer</span>
                    </div>
                  </div>

                  <div className="relative group">
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-2 uppercase">Target Waypoints</label>
                    <div className="relative">
                      <input
                        className="w-full bg-surface-container-lowest rounded-lg py-3 pl-12 pr-4 font-body-lg text-body-lg text-on-surface border border-border-subtle focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm font-mono"
                        type="number"
                        min="1"
                        max="30"
                        value={customWaypointCount}
                        onChange={e => setCustomWaypointCount(e.target.value)}
                        placeholder="Auto (e.g. 10)"
                      />
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400">pin_drop</span>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-1 font-mono">Specify exact count (e.g. 10)</p>
                  </div>

                  <div className="relative group">
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-2 uppercase">Activation Radius (m)</label>
                    <div className="relative">
                      <input
                        className="w-full bg-surface-container-lowest rounded-lg py-3 pl-12 pr-4 font-body-lg text-body-lg text-on-surface border border-border-subtle focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm font-mono"
                        type="number"
                        value={activationRadius}
                        onChange={e => setActivationRadius(e.target.value)}
                        placeholder="100"
                      />
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary">radar</span>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-1 font-mono">Trigger radius (Default: 100m)</p>
                  </div>
                </div>

                {/* Start Location Name with 3+ Character Autofill / Autocomplete */}
                <div className="relative group">
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-2 uppercase flex justify-between items-center">
                    <span>Start Location Name (Draggable)</span>
                    <span className="text-[11px] text-amber-500 font-normal">Drag flag on map to update</span>
                  </label>
                  <div className="relative">
                    <input
                      className="w-full bg-surface-container-lowest rounded-lg py-3 pl-12 pr-4 font-body-lg text-body-lg text-on-surface border border-border-subtle focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
                      type="text"
                      placeholder="e.g. Rathmines Jetty, Cairns Lagoon..."
                      value={startName}
                      onChange={e => {
                        setStartName(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                    />
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-amber-500">flag</span>

                    {/* Autocomplete Dropdown when 3+ characters typed */}
                    {showSuggestions && locationSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-surface-container-lowest border border-primary/40 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-border-subtle">
                        {locationSuggestions.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setStartName(item.display_name);
                              setStartLat(item.lat);
                              setStartLng(item.lng);
                              setShowSuggestions(false);
                              wsService.emitLog('SPATIAL', `Selected location from autofill: ${item.display_name} (${item.lat}, ${item.lng})`);
                              showToast(`📍 Start Location set to: ${item.display_name.split(',')[0]}`);
                            }}
                            className="w-full text-left p-3 hover:bg-primary-container/20 transition-colors flex items-start gap-2.5 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-primary text-sm mt-0.5">place</span>
                            <div>
                              <div className="font-bold text-xs text-on-surface">{item.display_name}</div>
                              <div className="text-[10px] font-mono text-text-secondary">{item.lat.toFixed(5)}°, {item.lng.toFixed(5)}°</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Finish Location Name & Drag Indicator with Autocomplete */}
                <div className="relative group">
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-2 uppercase flex justify-between items-center">
                    <span>Finish Location Name (Draggable)</span>
                    <span className="text-[11px] text-rose-500 font-normal">Type 3+ chars for search & autofill</span>
                  </label>
                  <div className="relative">
                    <input
                      className="w-full bg-surface-container-lowest rounded-lg py-3 pl-12 pr-4 font-body-lg text-body-lg text-on-surface border border-border-subtle focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all shadow-sm"
                      type="text"
                      placeholder="e.g. Style Point Moorings, Marlin Marina..."
                      value={finishName}
                      onChange={e => {
                        setFinishName(e.target.value);
                        setShowFinishSuggestions(true);
                      }}
                      onFocus={() => setShowFinishSuggestions(true)}
                    />
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-rose-500">sports_score</span>

                    {/* Autocomplete Dropdown for Finish Location */}
                    {showFinishSuggestions && finishLocationSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-surface-container-lowest border border-rose-500/40 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-border-subtle">
                        {finishLocationSuggestions.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setFinishName(item.display_name);
                              setFinishLat(item.lat);
                              setFinishLng(item.lng);
                              setShowFinishSuggestions(false);
                              onUpdateCourse({
                                ...course,
                                finishLocation: {
                                  ...course.finishLocation,
                                  name: item.display_name,
                                  lat: item.lat,
                                  lng: item.lng
                                }
                              });
                              wsService.emitLog('SPATIAL', `Selected finish location from autofill: ${item.display_name} (${item.lat}, ${item.lng})`);
                              showToast(`🏁 Finish Location set to: ${item.display_name.split(',')[0]}`);
                            }}
                            className="w-full text-left p-3 hover:bg-rose-500/10 transition-colors flex items-start gap-2.5 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-rose-500 text-sm mt-0.5">place</span>
                            <div>
                              <div className="font-bold text-xs text-on-surface">{item.display_name}</div>
                              <div className="text-[10px] font-mono text-text-secondary">{item.lat.toFixed(5)}°, {item.lng.toFixed(5)}°</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Course Assigned Teams Selector */}
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-theme-container-high space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">groups</span>
                      <span>Assigned Competition Teams for Course</span>
                    </label>
                    <span className="text-[10px] text-theme-sub font-normal">Check teams allowed to compete</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                    {authService.teams.map(team => {
                      const isAssigned = (team.assignedCourseIds || []).includes(course.id);
                      return (
                        <label key={team.id} className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer transition-colors ${
                          isAssigned ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200' : 'bg-theme-container border-theme text-theme-sub hover:text-theme-main'
                        }`}>
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={() => {
                              const currentTeams = authService.teams.filter(t => (t.assignedCourseIds || []).includes(course.id)).map(t => t.id);
                              const updatedTeamIds = isAssigned 
                                ? currentTeams.filter(id => id !== team.id)
                                : [...currentTeams, team.id];
                              authService.assignCourseToTeams(course.id, updatedTeamIds);
                              showToast(`Updated assigned teams for course "${course.title}"!`);
                            }}
                            className="rounded border-theme bg-theme-surface text-emerald-500 focus:ring-emerald-400"
                          />
                          <span className="font-bold text-[11px] truncate">{team.name} ({team.members?.length || 0} members)</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Dynamic Waypoint Calculation & Spatial Pace Card */}
                <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 space-y-3 font-mono text-xs shadow-sm">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">route</span>
                      <span>Spatial Pace & Waypoint Estimator</span>
                    </label>
                    <span className="text-[10px] bg-cyan-900/60 text-cyan-300 border border-cyan-700/50 px-2 py-0.5 rounded-full font-bold">
                      {optimalWaypointMetrics.count} Waypoints Target
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-surface-container-lowest border border-border-subtle">
                      <div className="text-[10px] text-text-secondary uppercase">Route Distance</div>
                      <div className="font-bold text-on-surface text-sm">{(optimalWaypointMetrics.estimatedRouteMeters / 1000).toFixed(2)} km</div>
                      <div className="text-[9px] text-text-secondary">({optimalWaypointMetrics.directDistanceMeters}m straight)</div>
                    </div>
                    
                    <div className="p-2 rounded-lg bg-surface-container-lowest border border-border-subtle">
                      <div className="text-[10px] text-text-secondary uppercase">Elevation Gain</div>
                      <div className="font-bold text-amber-400 text-sm">+{optimalWaypointMetrics.elevationGainMeters}m</div>
                      <div className="text-[9px] text-amber-500/80">+{optimalWaypointMetrics.inclinePenaltyMinutes}m incline penalty</div>
                    </div>

                    <div className="p-2 rounded-lg bg-surface-container-lowest border border-border-subtle">
                      <div className="text-[10px] text-text-secondary uppercase">Walking Time</div>
                      <div className="font-bold text-emerald-400 text-sm">{optimalWaypointMetrics.totalWalkMinutes} mins</div>
                      <div className="text-[9px] text-emerald-500/80">@ 4.8 km/h pace</div>
                    </div>

                    <div className="p-2 rounded-lg bg-surface-container-lowest border border-border-subtle">
                      <div className="text-[10px] text-text-secondary uppercase">Location Stay</div>
                      <div className="font-bold text-cyan-300 text-sm">{optimalWaypointMetrics.count * 5} mins</div>
                      <div className="text-[9px] text-cyan-400/80">5 mins / location</div>
                    </div>
                  </div>

                  <div className="text-[11px] text-cyan-200/90 leading-tight pt-1 border-t border-cyan-800/40 flex items-center justify-between flex-wrap gap-1">
                    <span>Target Duration: <strong>{duration} mins</strong></span>
                    <span className="text-[10px] text-cyan-400 font-semibold">{optimalWaypointMetrics.summary}</span>
                  </div>
                </div>

                {/* Collapsible Coordinate Parser & Location Selector Drawer */}
                <div className="rounded-xl border border-primary/20 bg-primary-container/5 overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => setIsParserOpen(!isParserOpen)}
                    className="w-full p-3.5 flex items-center justify-between font-label-md text-xs text-primary font-bold uppercase hover:bg-primary-container/10 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">tune</span>
                      <span>Coordinate Parser & Current Location</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-semibold text-on-surface-variant">
                        {startLat && startLng ? `${parseFloat(startLat).toFixed(4)}°, ${parseFloat(startLng).toFixed(4)}°` : 'Collapsed'}
                      </span>
                      <span className="material-symbols-outlined text-base">{isParserOpen ? 'expand_less' : 'expand_more'}</span>
                    </div>
                  </button>

                  {isParserOpen && (
                    <div className="p-4 pt-1 border-t border-primary/15 space-y-3">
                      
                      {/* "Use current location" Button inside Collapsed Parser */}
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <span className="text-xs text-on-surface-variant font-medium">Set start using device GPS:</span>
                        <button
                          type="button"
                          onClick={handleUsePhoneGPS}
                          disabled={isLocating}
                          className="px-3.5 py-2 rounded-full bg-primary text-on-primary hover:bg-surface-tint font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                        >
                          <span className={`material-symbols-outlined text-sm ${isLocating ? 'animate-spin' : ''}`}>my_location</span>
                          <span>{isLocating ? 'Acquiring GPS...' : 'Use Current Location'}</span>
                        </button>
                      </div>

                      {/* Quick Paste Box */}
                      <div>
                        <label className="block font-label-md text-[11px] text-text-secondary uppercase mb-1 font-mono">
                          Paste Coordinates, Maps URL, or GPS Text
                        </label>
                        <input
                          type="text"
                          value={rawCoordText}
                          onChange={e => handleRawCoordChange(e.target.value)}
                          placeholder="Paste Google Maps link, '-33.0372, 151.5945', or app GPS text..."
                          className="w-full bg-surface-container-lowest rounded-lg py-2.5 px-3.5 text-xs font-mono text-on-surface border border-border-subtle focus:outline-none focus:border-primary"
                        />
                        {parsedNotice && (
                          <div className={`mt-2 text-[11px] font-mono px-2.5 py-1 rounded font-semibold ${
                            parsedNotice.startsWith('✅')
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-950/60 text-amber-300 border border-amber-800'
                          }`}>
                            {parsedNotice}
                          </div>
                        )}
                      </div>

                      <div className="text-[11px] font-mono text-text-secondary flex justify-between items-center pt-1 border-t border-border-subtle/50">
                        <span>Active Coordinates:</span>
                        <span className="font-bold text-primary">{parseFloat(startLat).toFixed(5)}°, {parseFloat(startLng).toFixed(5)}°</span>
                      </div>

                    </div>
                  )}
                </div>

              </div>
            </section>

            {/* Section: Theme Selection & AI Web Research Course Generation */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-label-sm font-bold">02</div>
                  <div>
                    <h2 className="font-headline-md text-headline-md text-on-surface">Location Theme</h2>
                    <p className="text-xs text-text-secondary">Choose or add a theme to generate custom route waypoints via local AI web research.</p>
                  </div>
                </div>
              </div>

              {/* Add Custom Theme Form */}
              <form onSubmit={handleAddCustomTheme} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a new custom theme (e.g. Indigenous Lagoon Ecology, Sculpture Walk)..."
                  value={customThemeInput}
                  onChange={e => setCustomThemeInput(e.target.value)}
                  className="flex-1 bg-surface-container-lowest rounded-xl px-4 py-2.5 text-xs text-on-surface border border-border-subtle focus:outline-none focus:border-primary font-mono shadow-sm"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-secondary-container text-on-secondary-container hover:bg-secondary/20 text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>Add Theme</span>
                </button>
              </form>

              {/* Theme Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {availableThemes.map(item => {
                  const isActive = theme === item.name;
                  return (
                    <div
                      key={item.name}
                      onClick={() => setTheme(item.name)}
                      className={`text-left p-4 rounded-xl border transition-colors shadow-sm group relative overflow-hidden cursor-pointer flex flex-col justify-between ${
                        isActive
                          ? 'border-2 border-primary bg-primary/5'
                          : 'border-border-subtle bg-surface-container-lowest hover:bg-surface-container-low'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute top-0 right-0 bg-primary text-on-primary text-[10px] uppercase font-bold px-2 py-1 rounded-bl-lg">Active</div>
                      )}

                      <div className="flex justify-between items-start mb-2">
                        <span className={`material-symbols-outlined text-[28px] group-hover:scale-110 transition-transform ${isActive ? 'text-primary' : 'text-tertiary'}`} style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                          {item.icon}
                        </span>
                        
                        {/* Edit Theme Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingThemeItem({ originalName: item.name, name: item.name, icon: item.icon, desc: item.desc });
                          }}
                          title="Edit Theme"
                          className="p-1 rounded-lg bg-surface-container hover:bg-primary/10 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                      </div>

                      <div>
                        <h3 className={`font-label-md text-label-md mb-1 ${isActive ? 'text-primary' : 'text-on-surface'}`}>{item.name}</h3>
                        <p className="font-body-sm text-body-sm text-text-secondary line-clamp-2 mb-3">{item.desc}</p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTheme(item.name);
                          handleGenerateCourseWithAI(item.name);
                        }}
                        disabled={isGeneratingCourse}
                        className="mt-2 w-full py-1.5 px-3 rounded-lg bg-surface-container-high hover:bg-primary/10 text-primary border border-primary/30 text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-xs">travel_explore</span>
                        <span>Generate "{item.name}" Course</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Section: Course Clues */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-label-sm font-bold">03</div>
                  <h2 className="font-headline-md text-headline-md text-on-surface">Course Clues ({course.clues.length})</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOptimizeRouteOrder}
                    className="h-9 px-3 rounded-full font-label-md text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all font-bold flex items-center gap-1.5 cursor-pointer shadow-sm font-mono"
                    title="Auto-Sort Waypoints into Optimal Start-to-Finish Physical Walking Order"
                  >
                    <span className="material-symbols-outlined text-sm">alt_route</span>
                    <span>Auto-Sort Route</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingClue(true)}
                    className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high text-primary flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                    title="Add New Spatial Waypoint"
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                  </button>
                </div>
              </div>

              {/* Waypoint Cards List with Move Up, Move Down, Edit & Delete */}
              <div className="space-y-4">
                {course.clues.map((clue, idx) => {
                  const label = getWaypointLabel(idx);
                  const isActive = clue.id === activeClueId;

                  return (
                    <div
                      key={clue.id}
                      onClick={() => setActiveClueId(clue.id)}
                      className={`p-5 rounded-xl border-l-4 shadow-sm group hover:shadow-md transition-all relative cursor-pointer ${
                        isActive
                          ? 'bg-primary/10 border-l-primary border border-primary/30 ring-2 ring-primary/20'
                          : 'bg-surface-container-lowest border-l-primary border border-border-subtle'
                      }`}
                    >
                      <div className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center font-mono font-bold text-xs shadow-sm uppercase">
                        {label}
                      </div>

                      <div className="flex justify-between items-start mb-2 pl-2">
                        <div>
                          <h4 className="font-label-md text-label-md text-on-surface flex items-center gap-2">
                            <span>Waypoint {label}: {clue.title}</span>
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">{clue.category}</span>
                          </h4>
                        </div>

                      {/* Waypoint Action Controls: Move Up, Move Down, Edit, Delete */}
                      <div className="flex items-center gap-1">
                        <span className="bg-secondary-container text-on-secondary-container px-2 py-1 rounded font-label-sm font-bold text-xs mr-2">
                          {clue.points} PTS
                        </span>

                        <button
                          type="button"
                          onClick={() => handleMoveClue(clue.id, 'UP')}
                          disabled={idx === 0}
                          title="Move Waypoint Up"
                          className="p-1 rounded bg-surface-container hover:bg-primary/10 text-on-surface-variant hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">arrow_upward</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMoveClue(clue.id, 'DOWN')}
                          disabled={idx === course.clues.length - 1}
                          title="Move Waypoint Down"
                          className="p-1 rounded bg-surface-container hover:bg-primary/10 text-on-surface-variant hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">arrow_downward</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingClue({ ...clue })}
                          title="Edit Waypoint & Verification Criteria"
                          className="p-1 rounded bg-surface-container hover:bg-primary/10 text-on-surface-variant hover:text-primary cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteClue(clue.id)}
                          title="Delete Waypoint"
                          className="p-1 rounded bg-surface-container hover:bg-error-container text-on-surface-variant hover:text-error cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    </div>

                    <p className="font-body-sm text-body-sm text-text-secondary pl-2 mb-3">{clue.description}</p>

                    {/* Location Reference Photo Preview in Admin Sidebar */}
                    {clue.referencePhotoUrl && (
                      <div className="pl-2 mb-3">
                        <div className="relative rounded-lg overflow-hidden border border-border-subtle max-h-28 group">
                          <img src={clue.referencePhotoUrl} alt={clue.title} className="w-full h-28 object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute bottom-1 left-1 bg-surface/85 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono text-primary border border-border-subtle font-bold">
                            Location Reference Target
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="pl-2 space-y-1.5 font-mono text-[11px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-surface-variant text-on-surface-variant px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                          {clue.targetLocation.lat.toFixed(5)}°, {clue.targetLocation.lng.toFixed(5)}°
                        </span>
                        <span className="bg-sky-950/60 text-sky-300 border border-sky-800 px-2 py-0.5 rounded font-bold">
                          Activation Zone: {clue.targetRadiusMeters || 100}m
                        </span>
                      </div>
                      {clue.aiCriteria && (
                        <div className="text-text-secondary text-[10px] bg-surface-container-low p-2 rounded border border-border-subtle/50">
                          <span className="font-bold text-primary">Criteria:</span> {clue.aiCriteria}
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </section>

          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Map Canvas with Draggable Markers & Routes */}
        <div className="w-full lg:w-[55%] h-[512px] lg:h-auto relative bg-surface-variant z-0 shadow-inner">
          <MapLibreView
            center={[parseFloat(startLng) || course.startLocation.lng, parseFloat(startLat) || course.startLocation.lat]}
            zoom={15}
            startLocation={{
              name: startName,
              lat: parseFloat(startLat) || course.startLocation.lat,
              lng: parseFloat(startLng) || course.startLocation.lng,
              activationRadiusMeters: parseInt(activationRadius, 10) || 100
            }}
            finishLocation={{
              name: finishName,
              lat: parseFloat(finishLat) || course.finishLocation?.lat || -33.0395,
              lng: parseFloat(finishLng) || course.finishLocation?.lng || 151.5960
            }}
            clues={course.clues}
            activeClueId={activeClueId}
            onSelectClue={setActiveClueId}
            onEditClue={setEditingClue}
            onUpdateStartLocation={handleUpdateStartLocation}
            onUpdateFinishLocation={handleUpdateFinishLocation}
            onUpdateClueLocation={handleUpdateClueLocation}
          />

          {/* Movable & Collapsible Spatial Analysis Card Overlaying Map */}
          <div
            style={{ left: `${cardPos.x}px`, top: `${cardPos.y}px` }}
            className="absolute lg:w-96 bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-primary/30 z-20 transition-all select-none"
          >
            <div
              onMouseDown={handleAnalysisMouseDown}
              className="flex items-center justify-between cursor-move pb-2 border-b border-border-subtle/50"
              title="Click and drag to move Spatial Analysis panel"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">drag_indicator</span>
                <span className="font-label-md text-xs font-bold text-on-surface uppercase tracking-wider">Spatial Analysis</span>
                <span className="bg-primary/20 text-primary px-2 py-0.5 rounded font-mono text-[10px]">LIVE</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAnalysisCollapsed(!isAnalysisCollapsed)}
                className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors cursor-pointer"
                title={isAnalysisCollapsed ? "Expand Panel" : "Collapse Panel"}
              >
                <span className="material-symbols-outlined text-base">
                  {isAnalysisCollapsed ? 'unfold_more' : 'unfold_less'}
                </span>
              </button>
            </div>

            {!isAnalysisCollapsed && (
              <div className="space-y-2 mt-3">
                <div className="flex justify-between items-center text-body-sm">
                  <span className="text-text-secondary">Start Location</span>
                  <span className="font-mono text-on-surface text-xs font-bold truncate max-w-[200px]" title={startName}>{startName}</span>
                </div>
                <div className="flex justify-between items-center text-body-sm">
                  <span className="text-text-secondary">Start Lat/Lng</span>
                  <span className="font-mono text-on-surface text-xs font-bold">{parseFloat(startLat).toFixed(4)}°, {parseFloat(startLng).toFixed(4)}°</span>
                </div>
                <div className="flex justify-between items-center text-body-sm">
                  <span className="text-text-secondary">Finish Location</span>
                  <span className="font-mono text-rose-400 text-xs font-bold truncate max-w-[200px]" title={finishName}>{finishName}</span>
                </div>
                <div className="flex justify-between items-center text-body-sm">
                  <span className="text-text-secondary">Activation Radius</span>
                  <span className="font-mono text-primary font-bold">{activationRadius} meters</span>
                </div>
                <div className="flex justify-between items-center text-body-sm">
                  <span className="text-text-secondary">Total Distance</span>
                  <span className="font-mono text-on-surface font-bold">{courseMetrics.totalDistanceKm}</span>
                </div>
                <div className="flex justify-between items-center text-body-sm">
                  <span className="text-text-secondary">Est. Completion</span>
                  <span className="font-mono text-on-surface font-bold">{courseMetrics.estTime}</span>
                </div>
                <div className="w-full h-1.5 bg-surface-container-highest rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-primary rounded-full w-[100%]"></div>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Edit Waypoint Modal */}
      {editingClue && (
        <div className="fixed inset-0 z-50 bg-surface/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-primary max-w-lg w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface">Edit Waypoint #{editingClue.number}</h3>
              <button
                type="button"
                onClick={() => setEditingClue(null)}
                className="p-1 rounded-full text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEditClue} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase">Waypoint Title</label>
                <input
                  type="text"
                  required
                  value={editingClue.title}
                  onChange={e => setEditingClue({ ...editingClue, title: e.target.value })}
                  className="w-full mt-1 bg-surface rounded-lg px-3 py-2 text-sm text-on-surface border border-border-subtle focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Category</label>
                  <input
                    type="text"
                    value={editingClue.category}
                    onChange={e => setEditingClue({ ...editingClue, category: e.target.value })}
                    className="w-full mt-1 bg-surface rounded-lg px-3 py-2 text-xs text-on-surface border border-border-subtle focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Points</label>
                  <input
                    type="number"
                    value={editingClue.points}
                    onChange={e => setEditingClue({ ...editingClue, points: parseInt(e.target.value, 10) || 500 })}
                    className="w-full mt-1 bg-surface rounded-lg px-3 py-2 text-xs font-mono text-on-surface border border-border-subtle focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase">Description / Clue Instructions</label>
                <textarea
                  rows={3}
                  value={editingClue.description}
                  onChange={e => setEditingClue({ ...editingClue, description: e.target.value })}
                  className="w-full mt-1 bg-surface rounded-lg px-3 py-2 text-sm text-on-surface border border-border-subtle focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase flex justify-between items-center">
                  <span>Location Reference Photo (What users see)</span>
                  <span className="text-[10px] text-primary font-mono font-normal">Upload file or paste URL</span>
                </label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    placeholder="Image URL or upload file..."
                    value={editingClue.referencePhotoUrl || ''}
                    onChange={e => setEditingClue({ ...editingClue, referencePhotoUrl: e.target.value })}
                    className="flex-1 bg-surface rounded-lg px-3 py-2 text-xs text-on-surface border border-border-subtle focus:outline-none focus:border-primary font-mono"
                  />
                  <label className="px-3 py-2 rounded-lg bg-surface-container-high hover:bg-surface-variant text-primary border border-border-subtle text-xs font-bold cursor-pointer shrink-0 flex items-center gap-1">
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setEditingClue({ ...editingClue, referencePhotoUrl: ev.target.result });
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                </div>
                {editingClue.referencePhotoUrl && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-border-subtle max-h-32">
                    <img src={editingClue.referencePhotoUrl} alt="Location Preview" className="w-full h-32 object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-primary uppercase">Vision Verification Criteria Prompt</label>
                <textarea
                  rows={2}
                  value={editingClue.aiCriteria || ''}
                  onChange={e => setEditingClue({ ...editingClue, aiCriteria: e.target.value })}
                  placeholder="Enter custom criteria for evaluating photo submissions..."
                  className="w-full mt-1 bg-surface rounded-lg px-3 py-2 text-xs text-on-surface border border-border-subtle focus:outline-none focus:border-primary font-mono"
                />
              </div>

              {/* Interactive Search & Click/Drag Map Location Picker */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase flex justify-between items-center font-mono">
                  <span>Target Location Map Search & Pin Placement</span>
                  <span className="text-[10px] text-cyan-400 font-normal">Search place or click/drag marker on map</span>
                </label>
                <MapLocationPicker
                  lat={editingClue.targetLocation.lat}
                  lng={editingClue.targetLocation.lng}
                  height="220px"
                  onChangeLocation={({ lat, lng }) => setEditingClue({
                    ...editingClue,
                    targetLocation: { lat, lng }
                  })}
                />
              </div>

              <div className="grid grid-cols-3 gap-3 font-mono">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={editingClue.targetLocation.lat}
                    onChange={e => setEditingClue({
                      ...editingClue,
                      targetLocation: { ...editingClue.targetLocation, lat: parseFloat(e.target.value) || 0 }
                    })}
                    className="w-full mt-1 bg-surface rounded-lg px-3 py-2 text-xs text-on-surface border border-border-subtle focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={editingClue.targetLocation.lng}
                    onChange={e => setEditingClue({
                      ...editingClue,
                      targetLocation: { ...editingClue.targetLocation, lng: parseFloat(e.target.value) || 0 }
                    })}
                    className="w-full mt-1 bg-surface rounded-lg px-3 py-2 text-xs text-on-surface border border-border-subtle focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Activation (m)</label>
                  <input
                    type="number"
                    value={editingClue.targetRadiusMeters}
                    onChange={e => setEditingClue({
                      ...editingClue,
                      targetRadiusMeters: parseInt(e.target.value, 10) || 100
                    })}
                    className="w-full mt-1 bg-surface rounded-lg px-3 py-2 text-xs text-on-surface border border-border-subtle focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 p-2.5 rounded-xl bg-surface-container border border-border-subtle">
                <input
                  type="checkbox"
                  id="maskCoordinatesEdit"
                  checked={Boolean(editingClue.maskCoordinates)}
                  onChange={e => setEditingClue({ ...editingClue, maskCoordinates: e.target.checked })}
                  className="w-4 h-4 text-primary rounded focus:ring-primary bg-surface border-border-subtle cursor-pointer"
                />
                <label htmlFor="maskCoordinatesEdit" className="text-xs font-bold text-on-surface flex items-center justify-between w-full cursor-pointer">
                  <span>Mask Coordinates (Display Offset Organic Blotch Zone)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono font-bold">
                    BLOTCH ZONE MASK
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingClue(null)}
                  className="px-4 py-2 rounded-full border border-border-subtle text-xs font-semibold text-on-surface-variant cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-full bg-primary text-on-primary font-bold text-xs uppercase shadow-md hover:bg-surface-tint cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Clue Modal */}
      {isAddingClue && (
        <div className="fixed inset-0 z-50 bg-surface/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-primary max-w-2xl w-full space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h3 className="text-lg font-bold text-on-surface">Add New Spatial Clue</h3>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/30 uppercase font-bold">
                Waypoint #{course.clues.length + 1}
              </span>
            </div>

            <form onSubmit={handleCreateClue} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Clue Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Catalina Hangar Foundation"
                    value={newClueTitle}
                    onChange={e => setNewClueTitle(e.target.value)}
                    className="w-full mt-1 bg-surface rounded-lg px-3 py-2 text-sm text-on-surface border border-border-subtle focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Category</label>
                  <select
                    value={newClueCategory}
                    onChange={e => setNewClueCategory(e.target.value)}
                    className="w-full mt-1 bg-surface rounded-lg px-3 py-2 text-xs text-on-surface border border-border-subtle focus:outline-none focus:border-primary"
                  >
                    <option value="WW2 Heritage & Boating">WW2 Heritage & Boating</option>
                    <option value="Maritime & Boating">Maritime & Boating</option>
                    <option value="Historical GIS">Historical GIS</option>
                    <option value="Visual AI">Visual AI</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase font-mono">Description / Clue Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Clue instructions for participants..."
                  value={newClueDesc}
                  onChange={e => setNewClueDesc(e.target.value)}
                  className="w-full mt-1 bg-surface rounded-lg px-3 py-2 text-sm text-on-surface border border-border-subtle focus:outline-none focus:border-primary"
                />
              </div>

              {/* Interactive Search & Click/Drag Map Location Picker */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase flex justify-between items-center font-mono">
                  <span>Target Location Map Search & Pin Placement</span>
                  <span className="text-[10px] text-cyan-400 font-normal">Search place or click/drag marker on map</span>
                </label>
                <MapLocationPicker
                  lat={parseFloat(newClueLat) || -33.0372}
                  lng={parseFloat(newClueLng) || 151.5945}
                  height="240px"
                  onChangeLocation={({ lat, lng, addressName }) => {
                    setNewClueLat(lat);
                    setNewClueLng(lng);
                    if (addressName && !newClueTitle) {
                      setNewClueTitle(addressName.split(',')[0]);
                    }
                  }}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase flex justify-between items-center">
                  <span>Location Reference Photo (What users see)</span>
                  <span className="text-[10px] text-primary font-mono font-normal">Upload file or paste URL</span>
                </label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    placeholder="Image URL or upload file..."
                    value={newCluePhotoUrl}
                    onChange={e => setNewCluePhotoUrl(e.target.value)}
                    className="flex-1 bg-surface rounded-lg px-3 py-2 text-xs text-on-surface border border-border-subtle focus:outline-none focus:border-primary font-mono"
                  />
                  <label className="px-3 py-2 rounded-lg bg-surface-container-high hover:bg-surface-variant text-primary border border-border-subtle text-xs font-bold cursor-pointer shrink-0 flex items-center gap-1">
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setNewCluePhotoUrl(ev.target.result);
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                </div>
                {newCluePhotoUrl && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-border-subtle max-h-32">
                    <img src={newCluePhotoUrl} alt="Location Preview" className="w-full h-32 object-cover" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 font-mono">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={newClueLat}
                    onChange={e => setNewClueLat(e.target.value)}
                    className="w-full mt-1 bg-surface rounded-lg px-3 py-2 text-xs text-on-surface border border-border-subtle focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={newClueLng}
                    onChange={e => setNewClueLng(e.target.value)}
                    className="w-full mt-1 bg-surface rounded-lg px-3 py-2 text-xs text-on-surface border border-border-subtle focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Activation (m)</label>
                  <input
                    type="number"
                    value={newClueRadius}
                    onChange={e => setNewClueRadius(e.target.value)}
                    placeholder="100"
                    className="w-full mt-1 bg-surface rounded-lg px-3 py-2 text-xs text-on-surface border border-border-subtle focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddingClue(false)}
                  className="px-4 py-2 rounded-full border border-border-subtle text-xs font-semibold text-on-surface-variant cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-full bg-primary text-on-primary font-bold text-xs uppercase shadow-md hover:bg-surface-tint cursor-pointer"
                >
                  Save Waypoint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JSON Editor & Studio Modal */}
      {isJsonModalOpen && (
        <div className="fixed inset-0 z-50 bg-theme-surface/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-hidden">
          <div
            style={{ transform: `translate(${jsonModalPos.x}px, ${jsonModalPos.y}px)` }}
            className="bg-theme-container p-5 sm:p-6 rounded-2xl border border-theme w-[94vw] max-w-6xl h-[88vh] flex flex-col shadow-2xl text-theme-main font-mono transition-colors duration-300 select-text"
          >
            
            {/* Draggable Header */}
            <div
              onMouseDown={handleJsonModalMouseDown}
              className="flex items-center justify-between border-b border-theme pb-3 cursor-move select-none"
              title="Click and drag to move JSON Studio modal window"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-theme-primary text-lg">drag_indicator</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-theme-primary/15 text-theme-primary border border-theme font-bold uppercase tracking-wider">
                      Course Schema JSON Studio
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-theme-container-high text-theme-sub border border-theme">
                      Draggable Studio Window
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-theme-main mt-1 flex items-center gap-2">
                    Import / Export Course JSON
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsJsonModalOpen(false)}
                className="p-1.5 rounded-lg bg-theme-container-high text-theme-sub hover:text-theme-main hover:bg-theme-surface border border-theme transition-colors cursor-pointer"
                title="Close JSON Studio"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="py-2.5 flex items-center justify-between gap-4 text-xs text-theme-sub select-none">
              <p>
                Copy, edit, or paste your complete course JSON below to update waypoints, coordinates, descriptions, and rules in bulk without adding points manually one by one.
              </p>
              {jsonInputText && (
                <div className="hidden md:flex items-center gap-3 text-[11px] font-mono text-theme-primary bg-theme-container-high px-3 py-1 rounded-lg border border-theme shrink-0">
                  <span>{jsonInputText.split('\n').length} lines</span>
                  <span>•</span>
                  <span>{jsonInputText.length.toLocaleString()} chars</span>
                </div>
              )}
            </div>

            {/* JSON Code Textarea - takes up full remaining vertical space */}
            <div className="flex-1 min-h-0 w-full flex flex-col my-1">
              <textarea
                value={jsonInputText}
                onChange={e => setJsonInputText(e.target.value)}
                className="w-full h-full p-4 rounded-xl bg-theme-surface border border-theme text-xs sm:text-sm font-mono text-theme-main focus:outline-none focus:border-theme-primary custom-scrollbar leading-relaxed resize-y shadow-inner select-text"
                placeholder="Paste course JSON payload here..."
                spellCheck={false}
              />
            </div>

            {/* Footer Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-theme select-none">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(jsonInputText);
                    showToast("📋 Course JSON copied to clipboard!");
                  }}
                  className="px-3.5 py-2 rounded-xl bg-theme-container-high hover:bg-theme-surface text-theme-main border border-theme text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                  Copy JSON
                </button>

                <button
                  type="button"
                  onClick={() => handleExportJson(course)}
                  className="px-3.5 py-2 rounded-xl bg-theme-container-high hover:bg-theme-surface text-theme-primary border border-theme text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  Download .json
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsJsonModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-theme-container-high text-theme-sub hover:text-theme-main hover:bg-theme-surface border border-theme text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const success = importCourseFromJson(jsonInputText);
                    if (success) setIsJsonModalOpen(false);
                  }}
                  className="px-5 py-2 rounded-xl bg-theme-primary text-theme-surface font-extrabold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined text-sm">play_arrow</span>
                  Apply & Build Challenge
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Edit Theme Modal */}
      {editingThemeItem && (
        <div className="fixed inset-0 z-50 bg-surface/85 backdrop-blur-sm flex items-center justify-center p-4 font-body">
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-primary max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h3 className="text-lg font-bold text-on-surface">Edit Location Theme</h3>
              <button onClick={() => setEditingThemeItem(null)} className="p-1 text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              setAvailableThemes(availableThemes.map(t => t.name === editingThemeItem.originalName ? {
                name: editingThemeItem.name,
                icon: editingThemeItem.icon || 'auto_awesome',
                desc: editingThemeItem.desc
              } : t));
              if (theme === editingThemeItem.originalName) {
                setTheme(editingThemeItem.name);
              }
              showToast(`✏️ Updated theme "${editingThemeItem.name}"!`);
              setEditingThemeItem(null);
            }} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase">Theme Name</label>
                <input
                  type="text"
                  required
                  value={editingThemeItem.name}
                  onChange={e => setEditingThemeItem({ ...editingThemeItem, name: e.target.value })}
                  className="w-full mt-1 bg-surface rounded-lg px-3 py-2 text-sm text-on-surface border border-border-subtle focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase font-mono">Material Icon Symbol Name</label>
                <input
                  type="text"
                  value={editingThemeItem.icon}
                  onChange={e => setEditingThemeItem({ ...editingThemeItem, icon: e.target.value })}
                  className="w-full mt-1 bg-surface rounded-lg px-3 py-2 text-xs font-mono text-on-surface border border-border-subtle focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase">Description</label>
                <textarea
                  rows={2}
                  value={editingThemeItem.desc}
                  onChange={e => setEditingThemeItem({ ...editingThemeItem, desc: e.target.value })}
                  className="w-full mt-1 bg-surface rounded-lg px-3 py-2 text-xs text-on-surface border border-border-subtle focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingThemeItem(null)}
                  className="px-4 py-2 rounded-full border border-border-subtle text-xs font-semibold text-on-surface-variant cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-primary text-on-primary font-bold text-xs uppercase shadow-md hover:bg-surface-tint cursor-pointer"
                >
                  Save Theme
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
