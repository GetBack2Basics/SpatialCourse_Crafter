import React, { useState, useEffect, useRef } from 'react';
import MapLibreView from '../map/MapLibreView';
import SubmissionModal from './SubmissionModal';
import {
  calculateHaversineDistance,
  calculateAzimuth,
  calculateElevationAndGradient,
  getWaypointLabel
} from '../../utils/geoUtils';

/**
 * Reusable Draggable, Collapsible & High-Contrast Clear See-Through Glass Block Wrapper
 */
function DraggableBlock({
  id,
  title,
  icon,
  initialPos = { x: 0, y: 0 },
  initialCollapsed = false,
  collapsible = true,
  draggable = true,
  children,
  className = '',
  badge = null
}) {
  const [pos, setPos] = useState(initialPos);
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  const startDrag = (clientX, clientY) => {
    setIsDragging(true);
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: pos.x,
      initialY: pos.y
    };
  };

  const handleMouseDown = (e) => {
    if (!draggable) return;
    if (e.target.closest('.no-drag')) return;
    startDrag(e.clientX, e.clientY);
  };

  const handleTouchStart = (e) => {
    if (!draggable) return;
    if (e.target.closest('.no-drag')) return;
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPos({
        x: dragRef.current.initialX + dx,
        y: dragRef.current.initialY + dy
      });
    };

    const handleTouchMove = (e) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const dx = touch.clientX - dragRef.current.startX;
      const dy = touch.clientY - dragRef.current.startY;
      setPos({
        x: dragRef.current.initialX + dx,
        y: dragRef.current.initialY + dy
      });
    };

    const handleEnd = () => {
      if (isDragging) setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  const resetPos = (e) => {
    e.stopPropagation();
    setPos({ x: 0, y: 0 });
  };

  return (
    <div
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        zIndex: isDragging ? 50 : 20,
        transition: isDragging ? 'none' : 'transform 0.1s ease-out'
      }}
      className={`relative bg-theme-container/90 backdrop-blur-md border border-theme shadow-2xl transition-colors duration-300 rounded-xl text-theme-main ${
        isDragging ? 'ring-2 ring-theme-primary shadow-theme-primary/40' : ''
      } ${className}`}
    >
      {/* High Contrast Header Handle */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={`flex items-center justify-between px-3.5 py-2.5 border-b border-theme cursor-grab active:cursor-grabbing select-none bg-theme-container-high/80 hover:bg-theme-container-high rounded-t-xl transition-colors ${
          isCollapsed ? 'border-b-0 rounded-b-xl' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          {draggable && (
            <span className="material-symbols-outlined text-theme-sub text-base hover:text-theme-main">
              drag_indicator
            </span>
          )}
          {icon && (
            <span className="material-symbols-outlined text-theme-primary text-lg drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              {icon}
            </span>
          )}
          {title && (
            <span className="font-label-md text-label-md text-theme-main uppercase font-extrabold tracking-wider text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              {title}
            </span>
          )}
          {badge}
        </div>

        <div className="flex items-center gap-1.5 no-drag">
          {(pos.x !== 0 || pos.y !== 0) && (
            <button
              onClick={resetPos}
              title="Reset Position"
              className="text-theme-main hover:text-theme-primary text-[10px] font-extrabold uppercase font-mono px-2 py-0.5 rounded bg-theme-container hover:bg-theme-container-high border border-theme transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}

          {collapsible && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? "Expand" : "Collapse"}
              className="text-theme-main hover:text-theme-primary transition-colors p-1 rounded hover:bg-theme-container-high cursor-pointer"
            >
              <span className="material-symbols-outlined text-base font-bold">
                {isCollapsed ? 'unfold_more' : 'unfold_less'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* High Contrast Body Content */}
      {!isCollapsed && <div className="p-3.5">{children}</div>}
    </div>
  );
}

export default function ClueRunner({ course, activeTeam, submissions = [], onSubmitData, pendingSyncCount = 0, onSyncToCloud }) {
  const [activeClueId, setActiveClueId] = useState(course.clues[0]?.id);
  const [userLocation, setUserLocation] = useState(course.startLocation);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialMode, setModalInitialMode] = useState('GALLERY');

  const [inspectedPoint, setInspectedPoint] = useState(null);
  const [mapCenterOverride, setMapCenterOverride] = useState(null);
  const [isHudMinimized, setIsHudMinimized] = useState(false);
  const [usedLabelingHint, setUsedLabelingHint] = useState(false);

  // Draggable HUD position state
  const [hudPos, setHudPos] = useState({ x: 120, y: 16 });
  const [isHudDragging, setIsHudDragging] = useState(false);
  const [hudDragStart, setHudDragStart] = useState({ x: 0, y: 0 });

  const handleHudMouseDown = (e) => {
    setIsHudDragging(true);
    setHudDragStart({ x: e.clientX - hudPos.x, y: e.clientY - hudPos.y });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isHudDragging) {
        setHudPos({
          x: Math.max(8, Math.min(e.clientX - hudDragStart.x, 800)),
          y: Math.max(8, Math.min(e.clientY - hudDragStart.y, 480))
        });
      }
    };
    const handleMouseUp = () => setIsHudDragging(false);
    if (isHudDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isHudDragging, hudDragStart]);

  const activeClue = course.clues.find(c => c.id === activeClueId) || course.clues[0];

  // Target point being inspected (Start, Finish, or Waypoint Clue)
  const currentTarget = inspectedPoint || {
    id: activeClue.id,
    name: activeClue.title,
    lat: activeClue.targetLocation.lat,
    lng: activeClue.targetLocation.lng,
    type: 'CLUE',
    data: activeClue
  };

  // Native HTML5 Geolocation Watcher
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError("HTML5 Geolocation is not supported by your browser.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          name: "Device Location"
        });
        setGpsAccuracy(Math.round(position.coords.accuracy));
        setGpsError(null);
      },
      (error) => {
        console.warn("Geolocation watch error:", error.message);
        setGpsError(`GPS Warning: ${error.message}. Using course start point.`);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 1000
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Geodetic Distance, Azimuth & Elevation calculations
  const distanceToTargetMeters = calculateHaversineDistance(
    userLocation.lat, userLocation.lng,
    currentTarget.lat, currentTarget.lng
  );

  const azimuthData = calculateAzimuth(
    userLocation.lat, userLocation.lng,
    currentTarget.lat, currentTarget.lng
  );

  const elevationData = calculateElevationAndGradient(
    userLocation.lat, userLocation.lng,
    currentTarget.lat, currentTarget.lng
  );

  const activationRadiusMeters = activeClue.targetRadiusMeters || course.startLocation?.activationRadiusMeters || 50;
  const isWithinRadius = distanceToTargetMeters <= activationRadiusMeters;

  // Format distance (e.g. 2.1km or 450m)
  const formatDist = (meters) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)}km`;
    }
    return `${Math.round(meters)}m`;
  };

  // Generate 4+ distance breakup labels based on actual target distance
  const getDistanceBreakupLabels = (totalMeters, numSegments = 4) => {
    const labels = [];
    for (let i = 0; i <= numSegments; i++) {
      const distAtStep = (totalMeters / numSegments) * i;
      labels.push(formatDist(distAtStep));
    }
    return labels;
  };

  const breakupLabels = getDistanceBreakupLabels(distanceToTargetMeters, 4);

  // Estimate ETA based on 4 km/h walking pace
  const etaMinutes = Math.max(1, Math.round((distanceToTargetMeters / 1000 / 4) * 60));
  const formattedEta = etaMinutes >= 60 
    ? `${Math.floor(etaMinutes / 60)}h ${etaMinutes % 60}m` 
    : `${etaMinutes}m`;

  const mapCenter = mapCenterOverride || [activeClue.targetLocation.lng, activeClue.targetLocation.lat];

  const handleClueSelect = (clueId) => {
    setActiveClueId(clueId);
    const cl = course.clues.find(c => c.id === clueId);
    if (cl) {
      setInspectedPoint({
        id: cl.id,
        name: cl.title,
        lat: cl.targetLocation.lat,
        lng: cl.targetLocation.lng,
        type: 'CLUE',
        data: cl
      });
      setMapCenterOverride([cl.targetLocation.lng, cl.targetLocation.lat]);
    }
  };

  // Save & Export JSON Progress Backup (Discreet Tech Preparedness feature)
  const handleExportJSONProgress = () => {
    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      courseId: course.id,
      teamId: activeTeam?.id || 'team-runner',
      userLocation,
      activeClueId,
      submissions,
      usedTechBackup: true,
      saveCount: (submissions[0]?.saveCount || 0) + 1
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spatial_course_progress_backup_${course.id}.json`;
    a.click();
    URL.revokeObjectURL(url);

    // Record tech backup bonus in state / submissions
    if (onSubmitData) {
      onSubmitData({
        clueId: activeClue.id,
        teamId: activeTeam?.id || 'team-runner',
        usedTechBackup: true,
        saveCount: backupData.saveCount
      });
    }
  };

  // Re-import JSON Progress Backup
  const handleImportJSONProgress = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (parsed.activeClueId) setActiveClueId(parsed.activeClueId);
        if (parsed.userLocation) setUserLocation(parsed.userLocation);
        if (parsed.submissions && Array.isArray(parsed.submissions)) {
          parsed.submissions.forEach(sub => {
            if (onSubmitData) onSubmitData(sub);
          });
        }
        alert("✅ Course progress successfully restored from JSON backup!");
      } catch (err) {
        alert("⚠️ Invalid progress JSON file format.");
      }
    };
    reader.readAsText(file);
  };

  // Printable PDF / Paper View Generation
  const handleExportPDFPaper = () => {
    // Flag tech backup usage & earn preparedness bonus
    handleExportJSONProgress();

    const win = window.open('', '_blank');
    if (!win) return;

    const paperRows = course.clues.map((c, i) => {
      let locText = `Lat: ${c.targetLocation.lat.toFixed(5)}, Lng: ${c.targetLocation.lng.toFixed(5)}`;
      if (c.maskCoordinates) {
        // Compute non-centered Bounding Box (BBOX) range so exact pin location remains hidden
        const latDelta = 0.0035;
        const lngDelta = 0.0045;
        const minLat = (c.targetLocation.lat - latDelta).toFixed(4);
        const maxLat = (c.targetLocation.lat + latDelta).toFixed(4);
        const minLng = (c.targetLocation.lng - lngDelta).toFixed(4);
        const maxLng = (c.targetLocation.lng + lngDelta).toFixed(4);
        locText = `BBOX Zone: Lat [${minLat} to ${maxLat}], Lng [${minLng} to ${maxLng}] (Exact Pin Masked)`;
      }

      return `
        <div style="border: 1px solid #ccc; padding: 12px; margin-bottom: 12px; border-radius: 8px;">
          <h3 style="margin: 0 0 6px 0;">Waypoint #${i + 1}: ${c.title} (${c.points || 500} PTS)</h3>
          <p style="margin: 0 0 4px 0; font-size: 13px; color: #555;"><strong>Category:</strong> ${c.category || 'Geospatial'} | <strong>Activation:</strong> ${c.targetRadiusMeters || 50}m</p>
          <p style="margin: 0 0 4px 0; font-size: 13px; font-family: monospace;"><strong>Location:</strong> ${locText}</p>
          <p style="margin: 0 0 8px 0; font-style: italic;">"${c.description || 'Proceed to target coordinates and inspect features.'}"</p>
          <div style="border: 1px dashed #999; height: 50px; padding: 4px; font-size: 11px; color: #888;">
            Paper Response / Feature Notes:
          </div>
        </div>
      `;
    }).join('');

    win.document.write(`
      <html>
        <head>
          <title>Spatial Course Field Guide - ${course.title}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; color: #222; }
            h1 { color: #0284c7; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>${course.title} - Field Paper Backup Guide</h1>
          <p><strong>Team:</strong> ${activeTeam?.name || 'Far North GIS'} | <strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <hr/>
          ${paperRows}
          <script>window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="flex flex-col w-full h-full gap-4 px-margin-mobile pb-12 text-white">

      {/* 1. Active Target Card */}
      <DraggableBlock
        id="active-target"
        title="Active Target"
        icon="flag"
        className="bg-slate-950/70 backdrop-blur-md border-emerald-400/50"
        badge={
          <span className="text-xs font-extrabold text-amber-300 bg-slate-900 px-2.5 py-1 rounded-full border border-amber-400 font-mono shadow">
            {activeClue.points || 500} PTS
          </span>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <h3 className="font-headline-md text-headline-md text-white font-extrabold drop-shadow leading-tight">
              {currentTarget.name}
            </h3>
            <span className="material-symbols-outlined text-emerald-400 text-2xl shrink-0 drop-shadow">
              directions_walk
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-28 h-28 rounded-lg bg-slate-900 overflow-hidden border border-slate-700 shrink-0 relative shadow">
              <img
                alt="Reference Image"
                className="w-full h-full object-cover"
                src={activeClue.referencePhotoUrl || 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600'}
              />
              <span className="absolute bottom-1 right-1 bg-slate-950/90 text-[9px] text-cyan-300 px-1.5 py-0.5 rounded font-mono font-bold">
                Target Ref
              </span>
            </div>

            <div className="flex flex-col justify-between py-1 flex-1 space-y-3">
              <p className="font-body-sm text-body-sm text-slate-200 font-medium italic drop-shadow">
                "{activeClue.description || 'Proceed to target coordinates and inspect features.'}"
              </p>

              <button
                onClick={() => {
                  setModalInitialMode(isWithinRadius ? 'CAMERA' : 'GALLERY');
                  setIsModalOpen(true);
                }}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-label-md text-label-md py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors active:scale-[0.98] cursor-pointer shadow-lg font-extrabold no-drag"
              >
                <span className="material-symbols-outlined text-lg">photo_camera</span>
                UPLOAD PHOTO
              </button>
            </div>
          </div>
        </div>
      </DraggableBlock>

      {/* 2. Course Clues List Accordion */}
      <DraggableBlock
        id="course-clues"
        title={`Course Clues (${course.clues.length})`}
        icon="list_alt"
        className="bg-slate-950/70 backdrop-blur-md border-slate-700"
      >
        <div className="flex flex-col divide-y divide-slate-800">
          {course.clues.map((c, idx) => {
            const isCurrent = c.id === activeClue.id;
            const isCompleted = submissions.some(s => s.clueId === c.id);
            const clueDist = calculateHaversineDistance(
              userLocation.lat, userLocation.lng,
              c.targetLocation.lat, c.targetLocation.lng
            );

            return (
              <div
                key={c.id}
                onClick={() => handleClueSelect(c.id)}
                className={`p-3.5 flex flex-col gap-3 cursor-pointer transition-colors no-drag ${
                  isCurrent
                    ? 'bg-slate-900 border-l-4 border-l-cyan-400 rounded-r-xl shadow-lg'
                    : isCompleted
                    ? 'bg-slate-950/40 text-emerald-400'
                    : 'hover:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 font-mono text-xs font-bold ${
                      isCompleted 
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold' 
                        : isCurrent
                        ? 'bg-cyan-950 border-cyan-400 text-cyan-300 font-extrabold'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}>
                      {getWaypointLabel(idx).toUpperCase()}
                    </div>
                    <div>
                      <h4 className={`font-body-sm text-body-sm font-bold text-white drop-shadow mb-0.5 ${
                        !isCurrent && !isCompleted ? 'opacity-90' : ''
                      }`}>
                        {c.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-slate-900 text-slate-300 rounded border border-slate-700">
                          {c.category || 'Geospatial'}
                        </span>
                        <span className="text-xs font-mono text-cyan-300 font-extrabold drop-shadow">
                          {formatDist(clueDist)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isCompleted ? (
                    <span className="material-symbols-outlined text-emerald-400 text-xl font-bold">check_circle</span>
                  ) : isCurrent ? (
                    <span className="material-symbols-outlined text-cyan-400 text-xl font-bold">near_me</span>
                  ) : (
                    <span className="material-symbols-outlined text-slate-400 text-xl">arrow_forward</span>
                  )}
                </div>

                {/* Expanded Waypoint Details & Capture Photo Icon inside Chosen Menu Item */}
                {isCurrent && (
                  <div className="pt-2 border-t border-slate-800 space-y-3 animate-in fade-in duration-200">
                    <p className="text-xs text-slate-300 italic">
                      "{c.description || 'Proceed to target coordinates and inspect features.'}"
                    </p>

                    {c.referencePhotoUrl && (
                      <div className="w-full h-28 rounded-lg overflow-hidden border border-slate-700 relative shadow-inner">
                        <img src={c.referencePhotoUrl} alt={c.title} className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 right-1 bg-slate-950/90 text-[9px] text-cyan-300 px-1.5 py-0.5 rounded font-mono">
                          Target Reference
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1 font-mono text-xs">
                      <span className="text-[10px] text-cyan-300 px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 font-bold">
                        Activation: {c.targetRadiusMeters || 100}m
                      </span>

                      {/* Prominent Photo Upload/Capture Icon Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const activeDist = calculateHaversineDistance(
                            userLocation.lat, userLocation.lng,
                            c.targetLocation.lat, c.targetLocation.lng
                          );
                          const isWithin = activeDist <= (c.targetRadiusMeters || 100);
                          setModalInitialMode(isWithin ? 'CAMERA' : 'GALLERY');
                          setIsModalOpen(true);
                        }}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-transform active:scale-95 shadow-md cursor-pointer"
                        title="Upload/Capture photo for this waypoint"
                      >
                        <span className="material-symbols-outlined text-base">photo_camera</span>
                        <span>Upload Photo</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DraggableBlock>

      {/* 3. Topo Map Canvas & Overlaid HUD Components */}
      <div className="relative w-full h-[550px] rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700 bg-slate-950 flex-shrink-0">
        
        {/* Real Interactive MapLibre View */}
        <div className="absolute inset-0 w-full h-full z-0">
          <MapLibreView
            center={mapCenter}
            zoom={16}
            startLocation={course.startLocation}
            finishLocation={course.finishLocation}
            clues={course.clues}
            activeClueId={activeClue.id}
            userLocation={userLocation}
            submissions={submissions}
            showRouteLine={true}
            onSelectClue={handleClueSelect}
            onInspectPoint={(pt) => {
              setInspectedPoint(pt);
              if (pt.type === 'CLUE') {
                setActiveClueId(pt.id);
              }
              setMapCenterOverride([pt.lng, pt.lat]);
            }}
          />
        </div>

        {/* Floating Map Controls */}
        <div className="absolute top-4 left-3 z-20 flex flex-col gap-2">
          <button
            onClick={() => setMapCenterOverride([currentTarget.lng, currentTarget.lat])}
            title="Center on Target"
            className="w-10 h-10 bg-slate-950/80 backdrop-blur-md rounded-full flex items-center justify-center text-cyan-300 shadow-xl border border-cyan-400 hover:bg-slate-900 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>navigation</span>
          </button>
          <button
            onClick={() => setMapCenterOverride([userLocation.lng, userLocation.lat])}
            title="Center on My Location"
            className="w-10 h-10 bg-slate-950/80 backdrop-blur-md rounded-full flex items-center justify-center text-cyan-300 shadow-xl border border-cyan-400 hover:bg-slate-900 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">my_location</span>
          </button>

          {/* Discreet Tech Preparedness Backup Controls */}
          <button
            onClick={handleExportJSONProgress}
            title="Save Course Progress Backup (JSON)"
            className="w-8 h-8 bg-slate-950/70 backdrop-blur-md rounded-full flex items-center justify-center text-slate-400 hover:text-cyan-300 border border-slate-700 hover:border-cyan-400/50 transition-all cursor-pointer opacity-70 hover:opacity-100 mt-1"
          >
            <span className="material-symbols-outlined text-sm">file_download</span>
          </button>

          <label
            title="Restore Course Progress Backup (JSON)"
            className="w-8 h-8 bg-slate-950/70 backdrop-blur-md rounded-full flex items-center justify-center text-slate-400 hover:text-cyan-300 border border-slate-700 hover:border-cyan-400/50 transition-all cursor-pointer opacity-70 hover:opacity-100"
          >
            <span className="material-symbols-outlined text-sm">file_upload</span>
            <input type="file" accept=".json" onChange={handleImportJSONProgress} className="hidden" />
          </label>

          <button
            onClick={handleExportPDFPaper}
            title="Generate Paper Field Backup (Print PDF)"
            className="w-8 h-8 bg-slate-950/70 backdrop-blur-md rounded-full flex items-center justify-center text-slate-400 hover:text-amber-300 border border-slate-700 hover:border-amber-400/50 transition-all cursor-pointer opacity-70 hover:opacity-100"
          >
            <span className="material-symbols-outlined text-sm">print</span>
          </button>
        </div>

        {/* Floating Sync & Lock Submissions Button */}
        <div className="absolute top-4 right-3 z-20 flex flex-col items-end gap-2">
          {pendingSyncCount > 0 && (
            <button
              onClick={onSyncToCloud}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-label-md font-extrabold py-2 px-4 rounded-full flex items-center gap-2 shadow-xl border border-emerald-300 transition-all cursor-pointer animate-pulse"
            >
              <span className="material-symbols-outlined text-lg">cloud_upload</span>
              SYNC ({pendingSyncCount})
            </button>
          )}

          {/* Final Submission Lock Button */}
          {submissions.length >= course.clues.length && (
            <button
              onClick={() => {
                if (onSubmitData) {
                  onSubmitData({ isSubmissionLocked: true });
                }
                alert("🔒 Submissions locked! Leaderboard access unlocked for your team.");
              }}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-label-md font-extrabold py-1.5 px-3 rounded-full flex items-center gap-1.5 shadow-xl border border-cyan-300 transition-all cursor-pointer text-xs"
              title="Lock final team submissions to unlock Leaderboard view"
            >
              <span className="material-symbols-outlined text-sm">lock</span>
              <span>Lock Submissions</span>
            </button>
          )}
        </div>

        {/* HUD Compass & Telemetry Widget */}
        {isHudMinimized ? (
          /* Minimized State: Small icon button at bottom center of map with hover-over tooltip */
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsHudMinimized(false)}
              className="w-10 h-10 rounded-full bg-slate-950/90 border-2 border-cyan-400 text-cyan-300 hover:text-white hover:border-cyan-300 hover:scale-110 flex items-center justify-center cursor-pointer shadow-2xl transition-all group relative backdrop-blur-md"
              title={`${formatDist(distanceToTargetMeters)} ${azimuthData.cardinal} (${azimuthData.bearing}°) | Alt: ${elevationData.userElevation}m | ETA: ${formattedEta}`}
            >
              <span
                className="material-symbols-outlined text-xl transition-transform duration-300"
                style={{ transform: `rotate(${azimuthData.bearing}deg)`, fontVariationSettings: "'FILL' 1" }}
              >
                navigation
              </span>
              
              {/* Hover Tooltip - NO text on screen icon except on hover */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center bg-slate-950/95 border border-cyan-400/60 px-3 py-1.5 rounded-xl shadow-2xl text-[11px] font-mono text-cyan-200 whitespace-nowrap pointer-events-none z-30">
                <span className="font-bold text-white">{formatDist(distanceToTargetMeters)} {azimuthData.cardinal} ({azimuthData.bearing}°)</span>
                <span className="text-[10px] text-slate-300">Alt: {elevationData.userElevation}m • ETA: {formattedEta}</span>
              </div>
            </button>
          </div>
        ) : (
          /* Maximized State: Draggable Compact HUD */
          <div
            style={{ left: `${hudPos.x}px`, top: `${hudPos.y}px` }}
            className="absolute z-20 pointer-events-auto select-none"
          >
            <div
              onMouseDown={handleHudMouseDown}
              className="bg-slate-950/90 backdrop-blur-md border border-cyan-400/60 rounded-2xl p-2 shadow-2xl flex items-center gap-2 font-mono text-xs text-white cursor-move"
              title="Click and drag to reposition HUD anywhere on map"
            >
              <span className="material-symbols-outlined text-cyan-400 text-sm opacity-60">drag_indicator</span>

              {/* Rotating Mini Compass Dial */}
              <div className="w-11 h-11 rounded-full bg-slate-900 border border-cyan-400/50 flex items-center justify-center relative shrink-0 shadow-inner">
                <span className="absolute top-0.5 text-[8px] font-bold text-cyan-300">N</span>
                <div
                  className="transition-transform duration-500 flex items-center justify-center"
                  style={{ transform: `rotate(${azimuthData.bearing}deg)` }}
                >
                  <span className="material-symbols-outlined text-cyan-300 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                    navigation
                  </span>
                </div>
              </div>

              {/* Bearing, Distance & Elevation Specs */}
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-cyan-300 text-sm">{azimuthData.cardinal} ({azimuthData.bearing}°)</span>
                  <span className="text-emerald-300 font-extrabold text-xs">{formatDist(distanceToTargetMeters)}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-300">
                  <span>ALT: <strong className="text-cyan-200">{elevationData.userElevation}m</strong></span>
                  <span>ETA: <strong className="text-amber-400">{formattedEta}</strong></span>
                </div>
              </div>

              {/* Minimize Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsHudMinimized(true);
                }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer ml-1"
                title="Minimize HUD to bottom icon"
              >
                <span className="material-symbols-outlined text-sm">unfold_less</span>
              </button>

            </div>
          </div>
        )}

      </div>

      {/* 4. Elevation & Route Profile Banner */}
      <DraggableBlock
        id="route-profile"
        title="Route Profile & Elevation"
        icon="terrain"
        className="bg-slate-950/70 backdrop-blur-md border-emerald-400/50"
        badge={
          <span className="text-xs font-extrabold text-amber-300 uppercase font-mono drop-shadow bg-slate-900 px-2.5 py-1 rounded border border-amber-400/60 shadow">
            {currentTarget.name}: {formatDist(distanceToTargetMeters)}
          </span>
        }
      >
        <div className="flex flex-col gap-2.5">
          <div className="flex justify-between items-center text-xs font-extrabold uppercase font-mono drop-shadow">
            <div className="text-white">Current Alt: <span className="text-emerald-300 font-black text-sm">{elevationData.userElevation}m</span></div>
            <div className="text-white">Waypoint Alt: <span className="text-emerald-300 font-black text-sm">{elevationData.targetElevation}m</span></div>
          </div>

          {/* Dynamic Elevation Graph */}
          <div className="relative h-14 w-full border-b-2 border-l-2 border-white/30 flex items-end overflow-hidden rounded bg-slate-950/80 shadow-inner">
            <div className="absolute inset-0 flex justify-between pointer-events-none">
              <div className="w-px h-full bg-white/25"></div>
              <div className="w-px h-full bg-white/25"></div>
              <div className="w-px h-full bg-white/25"></div>
              <div className="w-px h-full bg-white/25"></div>
              <div className="w-px h-full bg-white/25"></div>
            </div>

            <div
              className="relative w-full h-full flex items-end opacity-95"
              style={{ clipPath: 'polygon(0 80%, 25% 60%, 50% 40%, 75% 20%, 100% 0, 100% 100%, 0 100%)' }}
            >
              <div className="flex-1 h-full bg-[#4caf50]"></div>
              <div className="flex-1 h-full bg-[#ffeb3b]"></div>
              <div className="flex-1 h-full bg-[#ff9800]"></div>
              <div className="flex-1 h-full bg-[#f44336]"></div>
            </div>

            <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
              <line stroke="white" strokeWidth="2.5" x1="0" x2="100" y1="80" y2="0"></line>
              <polygon fill="white" points="95,0 100,0 100,6"></polygon>
            </svg>

            <div className="absolute bottom-1 left-[12%] flex text-[#4caf50]">
              <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>park</span>
              <span className="material-symbols-outlined text-[11px] -ml-1" style={{ fontVariationSettings: "'FILL' 1" }}>park</span>
            </div>
            <div className="absolute bottom-1.5 right-[32%] flex flex-col items-center">
              <span className="material-symbols-outlined text-[11px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>landscape</span>
            </div>
          </div>

          {/* Dynamic 4+ Distance Breakup Labels - Extremely Legible */}
          <div className="flex justify-between text-[10px] text-white font-extrabold font-mono px-1 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
            {breakupLabels.map((lbl, i) => (
              <span key={i} className="bg-slate-900/80 px-1 py-0.5 rounded border border-white/20">{lbl}</span>
            ))}
          </div>
        </div>
      </DraggableBlock>

      {/* Submission Modal Component */}
      <SubmissionModal
        clue={activeClue}
        userLocation={userLocation}
        team={activeTeam}
        isOpen={isModalOpen}
        initialMode={modalInitialMode}
        onClose={() => setIsModalOpen(false)}
        onSubmit={onSubmitData}
      />

    </div>
  );
}
