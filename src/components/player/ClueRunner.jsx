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
      className={`relative bg-slate-950/60 backdrop-blur-md border border-cyan-400/40 shadow-2xl transition-all rounded-xl text-white ${
        isDragging ? 'ring-2 ring-cyan-300 shadow-cyan-400/60' : ''
      } ${className}`}
    >
      {/* High Contrast Header Handle */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={`flex items-center justify-between px-3.5 py-2.5 border-b border-white/20 cursor-grab active:cursor-grabbing select-none bg-slate-900/80 hover:bg-slate-900 rounded-t-xl transition-colors ${
          isCollapsed ? 'border-b-0 rounded-b-xl' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          {draggable && (
            <span className="material-symbols-outlined text-slate-300 text-base hover:text-white">
              drag_indicator
            </span>
          )}
          {icon && (
            <span className="material-symbols-outlined text-cyan-300 text-lg drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              {icon}
            </span>
          )}
          {title && (
            <span className="font-label-md text-label-md text-white uppercase font-extrabold tracking-wider text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
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
              className="text-white hover:text-cyan-300 text-[10px] font-extrabold uppercase font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}

          {collapsible && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? "Expand" : "Collapse"}
              className="text-white hover:text-cyan-300 transition-colors p-1 rounded hover:bg-slate-800 cursor-pointer"
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

export default function ClueRunner({ course, activeTeam, submissions = [], onSubmitData }) {
  const [activeClueId, setActiveClueId] = useState(course.clues[0]?.id);
  const [userLocation, setUserLocation] = useState(course.startLocation);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialMode, setModalInitialMode] = useState('GALLERY');

  const [inspectedPoint, setInspectedPoint] = useState(null);
  const [mapCenterOverride, setMapCenterOverride] = useState(null);

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

  const activationRadiusMeters = activeClue.targetRadiusMeters || course.startLocation?.activationRadiusMeters || 100;
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

  return (
    <div className="flex flex-col w-full h-full gap-4 px-margin-mobile pb-12 text-white">

      {/* 1. HTML5 Geolocation Status Bar - High Contrast Banner */}
      <DraggableBlock
        id="gps-bar"
        title="GPS Tracker"
        icon="navigation"
        className="bg-slate-950/70 backdrop-blur-md border-cyan-400/50"
        badge={
          <span className="text-xs font-mono text-cyan-200 font-extrabold px-2.5 py-1 rounded bg-slate-900 border border-cyan-400 shadow">
            ±{gpsAccuracy !== null ? gpsAccuracy : '?'}m
          </span>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-white font-extrabold drop-shadow">Coords:</span>
            <span className="text-cyan-200 font-bold drop-shadow">
              Lat {userLocation.lat.toFixed(5)}, Lng {userLocation.lng.toFixed(5)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-cyan-950 text-cyan-200 border border-cyan-400 font-extrabold shadow">
              Activation: {activationRadiusMeters}m
            </span>
            {gpsError && (
              <span className="px-2.5 py-1 rounded bg-amber-950 text-amber-200 border border-amber-400 font-extrabold flex items-center gap-1 shadow">
                <span className="material-symbols-outlined text-sm">warning</span>
                {gpsError}
              </span>
            )}
          </div>
        </div>
      </DraggableBlock>

      {/* 2. Elevation & Route Profile Banner - High Contrast Clear Glass Block ABOVE Map */}
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
        </div>

        {/* Central Compass HUD */}
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <DraggableBlock
            id="compass-hud"
            title="Compass HUD"
            icon="explore"
            className="bg-slate-950/70 backdrop-blur-md border-cyan-400/50 pointer-events-auto rounded-full p-1.5 shadow-2xl"
          >
            <div className="w-44 h-44 rounded-full bg-slate-950/60 border border-cyan-400/40 flex flex-col items-center justify-center relative shadow-2xl">
              {/* Compass Markings */}
              <span className="absolute top-1 font-extrabold text-cyan-300 text-xs font-mono drop-shadow">N</span>
              <span className="absolute right-2 font-extrabold text-white text-xs font-mono drop-shadow">E</span>
              <span className="absolute bottom-1 font-extrabold text-white text-xs font-mono drop-shadow">S</span>
              <span className="absolute left-2 font-extrabold text-white text-xs font-mono drop-shadow">W</span>

              {/* Ticks Ring */}
              <div
                className="absolute inset-1.5 rounded-full border border-cyan-400/30"
                style={{
                  background: 'repeating-conic-gradient(from 0deg, transparent 0deg, transparent 2deg, rgba(56,189,248,0.3) 2deg, rgba(56,189,248,0.3) 3deg)'
                }}
              ></div>

              {/* Live Rotating Needle */}
              <div
                className="absolute top-[12px] transition-transform duration-500"
                style={{ transform: `rotate(${azimuthData.bearing}deg)` }}
              >
                <span className="material-symbols-outlined text-[#ff6b00] text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,1)]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  change_history
                </span>
              </div>

              {/* Core Compass Readings */}
              <div className="flex flex-col items-center z-10">
                <span className="text-2xl font-black text-cyan-300 tracking-tight mt-3 font-mono drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                  {azimuthData.cardinal}
                </span>
                <span className="text-[10px] font-extrabold text-white uppercase tracking-widest font-mono drop-shadow">
                  Bearing: {azimuthData.bearing}°
                </span>
                <div className="w-8 h-8 rounded-full border-2 border-cyan-400 flex items-center justify-center mt-1 mb-1 bg-slate-900 shadow">
                  <span
                    className="material-symbols-outlined text-cyan-300 text-base transition-transform duration-500"
                    style={{ transform: `rotate(${azimuthData.bearing}deg)`, fontVariationSettings: "'FILL' 1" }}
                  >
                    navigation
                  </span>
                </div>
                <span className="text-xs font-extrabold text-emerald-300 uppercase tracking-widest font-mono drop-shadow">
                  Dist: {formatDist(distanceToTargetMeters)}
                </span>
              </div>
            </div>
          </DraggableBlock>
        </div>

        {/* Telemetry Elevation & Stats Panel */}
        <div className="absolute bottom-3 right-3 z-20 pointer-events-none">
          <DraggableBlock
            id="elevation-stats"
            title="Telemetry"
            icon="analytics"
            className="bg-slate-950/70 backdrop-blur-md border-cyan-400/50 pointer-events-auto min-w-[125px] shadow-2xl"
          >
            <div className="flex flex-col text-center font-mono">
              <div className="flex flex-col border-b border-white/20 pb-1 mb-1">
                <span className="text-[10px] uppercase font-extrabold text-slate-300 tracking-wider">ALT:</span>
                <span className="text-xs font-black text-cyan-300 drop-shadow">{elevationData.userElevation}m</span>
              </div>
              <div className="flex flex-col border-b border-white/20 pb-1 mb-1">
                <span className="text-[10px] uppercase font-extrabold text-slate-300 tracking-wider">Vert Dist:</span>
                <span className="text-xs font-black text-cyan-300 drop-shadow">
                  {elevationData.elevationZ >= 0 ? `+${elevationData.elevationZ}` : elevationData.elevationZ}m
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-extrabold text-slate-300 tracking-wider">ETA:</span>
                <span className="text-xs font-black text-[#ff9800] drop-shadow">{formattedEta}</span>
              </div>
            </div>
          </DraggableBlock>
        </div>

      </div>

      {/* 4. Active Target Card */}
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

      {/* 5. Clues List Accordion */}
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
                    ? 'bg-slate-900 border-l-4 border-l-cyan-400'
                    : isCompleted
                    ? 'bg-slate-950/40 text-emerald-400'
                    : 'hover:bg-slate-900/50'
                }`}
              >
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
            );
          })}
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
