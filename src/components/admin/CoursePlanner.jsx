import React, { useState, useEffect, useMemo } from 'react';
import MapLibreView from '../map/MapLibreView';
import { wsService } from '../../services/websocketService';
import { calculateHaversineDistance, parseCoordinates } from '../../utils/geoUtils';

export default function CoursePlanner({
  course,
  courses,
  selectedCourseId,
  onSelectCourse,
  onCreateNewCourse,
  onUpdateCourse
}) {
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

  // Real-time location search & autofill when typing 3+ characters in Start Location Name
  useEffect(() => {
    if (!startName || startName.trim().length < 3) {
      setLocationSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(startName)}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          const formatted = data.map(item => ({
            display_name: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          }));
          setLocationSuggestions(formatted);
        }
      } catch (e) {
        console.warn("Geocoding lookup notice:", e);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [startName]);

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
  const [newClueRadius, setNewClueRadius] = useState(100);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4000);
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
      <div className="w-full bg-surface-container-lowest shadow-sm z-10 px-margin-mobile lg:px-margin-desktop py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle">
        
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

          <div className="w-px h-6 bg-border-subtle hidden sm:block mx-1"></div>

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
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1440px] mx-auto overflow-hidden">
        
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
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-2 uppercase">Activation Distance (m)</label>
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
                    <p className="text-[11px] text-text-secondary mt-1 font-mono">Distance required to trigger waypoints (Default: 100m)</p>
                  </div>
                </div>

                {/* Start Location Name with Real-time 3+ Character Autofill / Autocomplete */}
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

                {/* Finish Location Name & Drag Indicator */}
                <div className="relative group">
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-2 uppercase flex justify-between items-center">
                    <span>Finish Location Name (Draggable)</span>
                    <span className="text-[11px] text-rose-500 font-normal">Drag red finish pin on map to update</span>
                  </label>
                  <div className="relative">
                    <input
                      className="w-full bg-surface-container-lowest rounded-lg py-3 pl-12 pr-4 font-body-lg text-body-lg text-on-surface border border-border-subtle focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all shadow-sm"
                      type="text"
                      placeholder="e.g. Style Point Moorings..."
                      value={finishName}
                      onChange={e => setFinishName(e.target.value)}
                    />
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-rose-500">sports_score</span>
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

            {/* Section: Theme Selection */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-label-sm font-bold">02</div>
                <h2 className="font-headline-md text-headline-md text-on-surface">Location Theme</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { name: 'Historical & Spatial', icon: 'history_edu', desc: 'Focus on historical progression across geographic zones.' },
                  { name: 'Cultural Heritage', icon: 'temple_buddhist', desc: 'Sites of profound cultural and societal impact.' },
                  { name: 'Eco & Environmental', icon: 'eco', desc: 'Natural reserves, topographies, and conservation zones.' },
                  { name: 'Geodetic Precision', icon: 'satellite_alt', desc: 'High-accuracy surveying marks and geospatial anchors.' }
                ].map(item => {
                  const isActive = theme === item.name;
                  return (
                    <button
                      key={item.name}
                      onClick={() => setTheme(item.name)}
                      className={`text-left p-4 rounded-xl border transition-colors shadow-sm group relative overflow-hidden cursor-pointer ${
                        isActive
                          ? 'border-2 border-primary bg-primary/5'
                          : 'border-border-subtle bg-surface-container-lowest hover:bg-surface-container-low'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute top-0 right-0 bg-primary text-on-primary text-[10px] uppercase font-bold px-2 py-1 rounded-bl-lg">Active</div>
                      )}
                      <span className={`material-symbols-outlined mb-2 text-[28px] group-hover:scale-110 transition-transform ${isActive ? 'text-primary' : 'text-tertiary'}`} style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                        {item.icon}
                      </span>
                      <h3 className={`font-label-md text-label-md mb-1 ${isActive ? 'text-primary' : 'text-on-surface'}`}>{item.name}</h3>
                      <p className="font-body-sm text-body-sm text-text-secondary line-clamp-2">{item.desc}</p>
                    </button>
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
                <button
                  onClick={() => setIsAddingClue(true)}
                  className="w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high text-primary flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                  title="Add New Spatial Waypoint"
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>

              {/* Waypoint Cards List with Move Up, Move Down, Edit & Delete */}
              <div className="space-y-4">
                {course.clues.map((clue, idx) => (
                  <div key={clue.id} className="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-l-primary shadow-sm group hover:shadow-md transition-shadow relative">
                    <div className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-sm font-bold shadow-sm">
                      {clue.number}
                    </div>

                    <div className="flex justify-between items-start mb-2 pl-2">
                      <div>
                        <h4 className="font-label-md text-label-md text-on-surface flex items-center gap-2">
                          <span>{clue.title}</span>
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
                          title="Edit Waypoint & AI Criteria"
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
                          <span className="font-bold text-primary">AI Criteria:</span> {clue.aiCriteria}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
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
            onUpdateStartLocation={handleUpdateStartLocation}
            onUpdateFinishLocation={handleUpdateFinishLocation}
            onUpdateClueLocation={handleUpdateClueLocation}
          />

          {/* Floating Map Controls */}
          <div className="absolute top-6 right-6 flex flex-col gap-2 z-20">
            <div className="bg-surface-container-lowest rounded-xl shadow-md p-1 flex flex-col">
              <button className="w-10 h-10 flex items-center justify-center text-on-surface hover:bg-surface-container hover:text-primary rounded-lg transition-colors">
                <span className="material-symbols-outlined">add</span>
              </button>
              <div className="w-6 h-px bg-border-subtle mx-auto my-1"></div>
              <button className="w-10 h-10 flex items-center justify-center text-on-surface hover:bg-surface-container hover:text-primary rounded-lg transition-colors">
                <span className="material-symbols-outlined">remove</span>
              </button>
            </div>
            <button className="w-12 h-12 bg-surface-container-lowest rounded-full shadow-md flex items-center justify-center text-on-surface hover:bg-surface-container hover:text-primary transition-colors mt-2">
              <span className="material-symbols-outlined">my_location</span>
            </button>
            <button className="w-12 h-12 bg-surface-container-lowest rounded-full shadow-md flex items-center justify-center text-on-surface hover:bg-surface-container hover:text-primary transition-colors">
              <span className="material-symbols-outlined">layers</span>
            </button>
          </div>

          {/* Dynamic Spatial Analysis Card Overlaying Map */}
          <div className="absolute bottom-6 left-6 right-6 lg:right-auto lg:w-96 bg-surface/90 backdrop-blur-md rounded-xl p-4 shadow-xl border border-border-subtle z-20">
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-md text-label-md text-on-surface uppercase tracking-wider">Spatial Analysis</span>
              <span className="bg-primary/20 text-primary px-2 py-0.5 rounded font-mono text-[10px]">LIVE</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-body-sm">
                <span className="text-text-secondary">Start Location</span>
                <span className="font-mono text-on-surface text-xs font-bold truncate max-w-[200px]" title={startName}>{startName}</span>
              </div>
              <div className="flex justify-between items-center text-body-sm">
                <span className="text-text-secondary">Start Lat/Lng</span>
                <span className="font-mono text-on-surface text-xs font-bold">{parseFloat(startLat).toFixed(4)}°, {parseFloat(startLng).toFixed(4)}°</span>
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
                <label className="text-xs font-bold text-primary uppercase">AI Vision Verification Criteria Prompt</label>
                <textarea
                  rows={2}
                  value={editingClue.aiCriteria || ''}
                  onChange={e => setEditingClue({ ...editingClue, aiCriteria: e.target.value })}
                  placeholder="Enter custom AI prompt criteria for evaluating photo submissions..."
                  className="w-full mt-1 bg-surface rounded-lg px-3 py-2 text-xs text-on-surface border border-border-subtle focus:outline-none focus:border-primary font-mono"
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
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-primary max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-on-surface">Add New Spatial Clue</h3>

            <form onSubmit={handleCreateClue} className="space-y-3">
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

              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase">Description / Clue Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Clue instructions for participants..."
                  value={newClueDesc}
                  onChange={e => setNewClueDesc(e.target.value)}
                  className="w-full mt-1 bg-surface rounded-lg px-3 py-2 text-sm text-on-surface border border-border-subtle focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 font-mono">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newClueLat}
                    onChange={e => setNewClueLat(e.target.value)}
                    className="w-full mt-1 bg-surface rounded-lg px-3 py-2 text-xs text-on-surface border border-border-subtle focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
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

    </div>
  );
}
