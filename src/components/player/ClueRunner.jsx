import React, { useState, useEffect, useRef } from 'react';
import MapLibreView from '../map/MapLibreView';
import SubmissionModal from './SubmissionModal';
import { authService } from '../../services/authService';
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

  const handleDragIconMouseDown = (e) => {
    if (!draggable) return;
    e.stopPropagation();
    startDrag(e.clientX, e.clientY);
  };

  const handleDragIconTouchStart = (e) => {
    if (!draggable) return;
    e.stopPropagation();
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
        className={`flex items-center justify-between px-3.5 py-2.5 border-b border-theme select-none bg-theme-container-high/80 rounded-t-xl transition-colors ${
          isCollapsed ? 'border-b-0 rounded-b-xl' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          {draggable && (
            <span
              onMouseDown={handleDragIconMouseDown}
              onTouchStart={handleDragIconTouchStart}
              className="material-symbols-outlined text-theme-sub text-base hover:text-theme-primary cursor-grab active:cursor-grabbing p-1 rounded hover:bg-theme-container-high touch-none"
              title="Click and drag to move panel"
            >
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

export default function ClueRunner({ course, courses = [], selectedCourseId, onSelectCourse, activeTeam, currentUser, onOpenAuthModal, submissions = [], onSubmitData, pendingSyncCount = 0, onSyncToCloud }) {
  const [activeClueId, setActiveClueId] = useState(course.clues[0]?.id);

  // Sync active clue when course changes
  useEffect(() => {
    if (course.clues && course.clues.length > 0) {
      setActiveClueId(course.clues[0].id);
    }
  }, [course.id]);
  const [userLocation, setUserLocation] = useState(course.startLocation);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialMode, setModalInitialMode] = useState('GALLERY');
  const [isRefreshingAuth, setIsRefreshingAuth] = useState(false);

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
          <p><strong>Team:</strong> ${activeTeam?.name || 'Field Agent Team'} | <strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <hr/>
          ${paperRows}
          <script>window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const [showToolsMenu, setShowToolsMenu] = useState(false);

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-4rem)] flex-1 gap-4 px-margin-mobile pb-8 text-white relative">

      {/* Course Selection Dropdown Header - Clean (No text above) */}
      {courses.length > 0 && onSelectCourse && (
        <div className="w-full">
          <select
            value={selectedCourseId || course.id}
            onChange={(e) => onSelectCourse(e.target.value)}
            className="w-full bg-slate-950/90 backdrop-blur-md border-2 border-cyan-500/60 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-400 shadow-xl cursor-pointer"
          >
            {courses.map(c => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.clues?.length || 0} waypoints)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Access Restricted Banner if User is Not Assigned to Selected Course */}
      {(() => {
        const activeUser = currentUser || authService.getCurrentUser();
        const userEmail = activeUser?.email?.toLowerCase();
        const isSuper = authService.isSuperAdmin();
        const isAdminUser = authService.isAdmin();
        
        // Find if user or user's teams are assigned to this course
        const userTeams = authService.teams.filter(t => (t.members || []).some(m => m.toLowerCase() === userEmail));
        const isAssigned = isSuper || isAdminUser || (activeUser?.assignedCourseIds || []).includes(course.id) || userTeams.some(t => (t.assignedCourseIds || []).includes(course.id));

        if (!isAssigned) {
          const hasRequested = userTeams.some(t => (t.pendingRequests || []).some(r => r.email.toLowerCase() === userEmail));

          return (
            <div className="p-4 rounded-2xl bg-amber-950/80 border-2 border-amber-500/60 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono">
              <div className="space-y-1">
                <span className="text-xs font-bold text-amber-300 uppercase flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">lock</span>
                  <span>Project Access Restricted: "{course.title}"</span>
                </span>
                <p className="text-[11px] text-amber-200">
                  You are viewing this challenge in read-only mode. Submit a request to join an assigned team or request course access.
                </p>
              </div>

              {hasRequested ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3 py-1.5 rounded-xl bg-amber-900/90 text-amber-200 border border-amber-600 text-xs font-bold flex items-center gap-1.5 shadow">
                    <span>⏳ Access Request Pending</span>
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsRefreshingAuth(true);
                      await authService.syncCloudState();
                      setTimeout(() => setIsRefreshingAuth(false), 500);
                    }}
                    title="Check for Admin Approval"
                    className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all active:scale-95 shadow cursor-pointer flex items-center justify-center"
                  >
                    <span className={`material-symbols-outlined text-sm ${isRefreshingAuth ? 'animate-spin' : ''}`}>
                      refresh
                    </span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenAuthModal) onOpenAuthModal();
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider shrink-0 cursor-pointer shadow-lg transition-transform active:scale-95"
                >
                  Request Access / Join Team
                </button>
              )}
            </div>
          );
        }
        return null;
      })()}

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

          <div className="flex flex-col space-y-3">
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
              Capture/Edit Entry
            </button>
          </div>
        </div>
      </DraggableBlock>

      {/* 2. Course Clues List Accordion - Clean (No redundant description in dropdown) */}
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
                className={`p-3 flex items-center justify-between cursor-pointer transition-colors no-drag ${
                  isCurrent
                    ? 'bg-slate-900 border-l-4 border-l-cyan-400 rounded-r-xl shadow-lg'
                    : isCompleted
                    ? 'bg-slate-950/40 text-emerald-400'
                    : 'hover:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center gap-3">
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
                    <h4 className={`font-body-sm text-body-sm font-bold text-white drop-shadow ${
                      !isCurrent && !isCompleted ? 'opacity-90' : ''
                    }`}>
                      {c.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 bg-slate-900 text-slate-300 rounded border border-slate-700">
                        {c.category || 'Geospatial'}
                      </span>
                      <span className="text-xs font-mono text-cyan-300 font-extrabold drop-shadow">
                        {formatDist(clueDist)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isCurrent && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalInitialMode(isWithinRadius ? 'CAMERA' : 'GALLERY');
                        setIsModalOpen(true);
                      }}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-1.5 rounded-lg flex items-center justify-center transition-transform active:scale-95 shadow cursor-pointer"
                      title="Capture/Edit Entry"
                    >
                      <span className="material-symbols-outlined text-base">photo_camera</span>
                    </button>
                  )}
                  {isCompleted ? (
                    <span className="material-symbols-outlined text-emerald-400 text-xl font-bold">check_circle</span>
                  ) : isCurrent ? (
                    <span className="material-symbols-outlined text-cyan-400 text-xl font-bold">near_me</span>
                  ) : (
                    <span className="material-symbols-outlined text-slate-400 text-xl">arrow_forward</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DraggableBlock>

      {/* 3. Topo Map Canvas & Overlaid HUD Components */}
      <div className="relative w-full h-[65vh] max-h-[500px] min-h-[360px] rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700 bg-slate-950 flex-shrink-0">
        
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
            onClick={() => {
              // Pan smoothly to current GPS location without altering zoom
              setMapCenterOverride([userLocation.lng, userLocation.lat]);
            }}
            title="Pan to My Current Location"
            className="w-10 h-10 bg-slate-950/80 backdrop-blur-md rounded-full flex items-center justify-center text-cyan-300 shadow-xl border border-cyan-400 hover:bg-slate-900 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">my_location</span>
          </button>

          {/* Consolidated Tools Menu (Export/Import/Print) */}
          <div className="relative">
            <button
              onClick={() => setShowToolsMenu(!showToolsMenu)}
              title="Field & Data Backup Tools"
              className="w-10 h-10 bg-slate-950/80 backdrop-blur-md rounded-full flex items-center justify-center text-amber-300 shadow-xl border border-amber-400 hover:bg-slate-900 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">build</span>
            </button>

            {showToolsMenu && (
              <div className="absolute top-0 left-12 bg-slate-950/95 backdrop-blur-md border border-slate-700 rounded-xl p-2 shadow-2xl flex flex-col gap-1.5 z-30 font-mono text-xs w-44">
                <button
                  onClick={() => { handleExportJSONProgress(); setShowToolsMenu(false); }}
                  className="p-2 rounded-lg hover:bg-slate-900 text-slate-200 hover:text-cyan-300 flex items-center gap-2 text-left"
                >
                  <span className="material-symbols-outlined text-base">file_download</span>
                  <span>Export JSON</span>
                </button>
                
                <label className="p-2 rounded-lg hover:bg-slate-900 text-slate-200 hover:text-cyan-300 flex items-center gap-2 cursor-pointer text-left">
                  <span className="material-symbols-outlined text-base">file_upload</span>
                  <span>Import JSON</span>
                  <input type="file" accept=".json" onChange={(e) => { handleImportJSONProgress(e); setShowToolsMenu(false); }} className="hidden" />
                </label>

                <button
                  onClick={() => { handleExportPDFPaper(); setShowToolsMenu(false); }}
                  className="p-2 rounded-lg hover:bg-slate-900 text-slate-200 hover:text-amber-300 flex items-center gap-2 text-left"
                >
                  <span className="material-symbols-outlined text-base">print</span>
                  <span>Print Paper PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Compact Bottom-Left Cloud Sync Button (75% smaller, icon + count only) */}
        {pendingSyncCount > 0 && (
          <div className="absolute bottom-3 left-3 z-20">
            <button
              onClick={onSyncToCloud}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-2 rounded-full flex items-center justify-center gap-1 shadow-2xl border border-emerald-300 transition-all cursor-pointer animate-pulse font-mono text-xs font-black"
              title={`Sync ${pendingSyncCount} pending submission(s) to cloud`}
            >
              <span className="material-symbols-outlined text-base">cloud_upload</span>
              <span className="text-[10px] font-bold">({pendingSyncCount})</span>
            </button>
          </div>
        )}

        {/* HUD Compass & Telemetry Widget */}
        {isHudMinimized ? (
          /* Minimized State: Small icon button at bottom center of map */
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
            </button>
          </div>
        ) : (
          /* Maximized State: Draggable Compass HUD positioned at Bottom Center by default */
          <div
            style={{
              transform: `translate3d(${hudPos.x}px, ${hudPos.y}px, 0)`
            }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-auto select-none transition-transform duration-75"
          >
            <div
              className="bg-slate-950/90 backdrop-blur-md border border-cyan-400/60 rounded-2xl p-2 shadow-2xl flex items-center gap-2 font-mono text-xs text-white"
            >
              <span
                onMouseDown={(e) => {
                  const startX = e.clientX - hudPos.x;
                  const startY = e.clientY - hudPos.y;
                  const onMouseMove = (me) => {
                    setHudPos({ x: me.clientX - startX, y: me.clientY - startY });
                  };
                  const onMouseUp = () => {
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('mouseup', onMouseUp);
                  };
                  window.addEventListener('mousemove', onMouseMove);
                  window.addEventListener('mouseup', onMouseUp);
                }}
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  const startX = touch.clientX - hudPos.x;
                  const startY = touch.clientY - hudPos.y;
                  const onTouchMove = (te) => {
                    const t = te.touches[0];
                    setHudPos({ x: t.clientX - startX, y: t.clientY - startY });
                  };
                  const onTouchEnd = () => {
                    window.removeEventListener('touchmove', onTouchMove);
                    window.removeEventListener('touchend', onTouchEnd);
                  };
                  window.addEventListener('touchmove', onTouchMove);
                  window.addEventListener('touchend', onTouchEnd);
                }}
                className="material-symbols-outlined text-cyan-400 text-base hover:text-white cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-800 touch-none"
                title="Click and drag icon to move compass HUD"
              >
                drag_indicator
              </span>

              {/* Rotating Mini Compass Dial - FIX: True North Pointing Arrow */}
              <div className="w-11 h-11 rounded-full bg-slate-900 border border-cyan-400/50 flex items-center justify-center relative shrink-0 shadow-inner">
                {/* Fixed True North Label at Top of Compass Ring */}
                <span className="absolute top-0.5 text-[9px] font-extrabold text-amber-300 drop-shadow">N</span>
                
                {/* Rotating Directional Bearing Arrow pointing to Target */}
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

      {/* 4. Elevation & Route Profile Banner - Concise Header (Icon + Name + Distance) */}
      <DraggableBlock
        id="route-profile"
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
