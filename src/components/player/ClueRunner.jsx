import React, { useState, useEffect } from 'react';
import { Navigation, Compass, MapPin, CheckCircle2, Clock, Users, ArrowUpRight, Camera, AlertCircle, Upload, Image as ImageIcon } from 'lucide-react';
import MapLibreView from '../map/MapLibreView';
import SubmissionModal from './SubmissionModal';
import { calculateHaversineDistance, calculateBearing, calculateAzimuth, calculateElevationAndGradient, getWaypointLabel } from '../../utils/geoUtils';

export default function ClueRunner({ course, activeTeam, submissions = [], onSubmitData }) {
  const [activeClueId, setActiveClueId] = useState(course.clues[0]?.id);
  const [userLocation, setUserLocation] = useState(course.startLocation);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialMode, setModalInitialMode] = useState('GALLERY');

  const [inspectedPoint, setInspectedPoint] = useState(null);

  const activeClue = course.clues.find(c => c.id === activeClueId) || course.clues[0];

  // Target point being inspected (Start, Finish, or Waypoint)
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

  // Calculate Haversine distance, azimuth compass & terrain gradient Z
  const distanceToTarget = calculateHaversineDistance(
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
  const isWithinRadius = distanceToTarget <= activationRadiusMeters;

  return (
    <div className="space-y-6">
      
      {/* HTML5 Geolocation Status Bar */}
      <div className="glass-panel p-3.5 rounded-2xl border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-950/80">
        <div className="flex items-center gap-2 font-mono text-cyan-400">
          <Navigation className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>HTML5 GPS TRACKER:</span>
          <span className="text-slate-200 font-bold">
            Lat {userLocation.lat.toFixed(5)}, Lng {userLocation.lng.toFixed(5)}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-lg bg-sky-950 text-sky-300 border border-sky-800">
            Activation: {activationRadiusMeters}m
          </span>
          {gpsAccuracy !== null && (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800">
              Accuracy: ±{gpsAccuracy}m
            </span>
          )}
          {gpsError && (
            <span className="px-2.5 py-1 rounded-lg bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {gpsError}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Target Clue Runner Card & Clues Navigation */}
        <div className="space-y-5">
          
          {/* Active Target Compass & Geodetic HUD Card */}
          <div className="glass-panel-glow p-5 rounded-3xl border border-sky-500/40 relative overflow-hidden space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800 uppercase font-bold">
                INSPECTED TARGET: {currentTarget.name}
              </span>
              <span className="text-xs font-bold text-amber-300 font-mono">{activeClue.points} PTS</span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-100">{activeClue.title}</h3>
              <p className="text-xs text-slate-400 mt-1">{activeClue.description}</p>
            </div>

            {/* Location Reference Target Photo (What people will see at location) */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 group">
              <img
                src={activeClue.referencePhotoUrl || 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600'}
                alt={activeClue.title}
                className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute bottom-2 left-2 right-2 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-mono text-cyan-300 border border-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Location Reference
                </span>
                <span className="text-amber-300 font-bold uppercase">What You Will See</span>
              </div>
            </div>

            {/* Distance, Azimuth & Gradient Meter */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-sky-500/40 space-y-3 font-mono">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-sky-400" style={{ transform: `rotate(${azimuthData.bearing}deg)` }} />
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Live Distance</div>
                    <div className="text-base font-bold text-slate-100">{distanceToTarget}m</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase">Azimuth Heading</div>
                  <div className="text-sm font-bold text-sky-300">{azimuthData.azimuthStr}</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase">Elevation Diff (Z)</span>
                  <span className="text-emerald-400 font-bold">
                    {elevationData.elevationZ >= 0 ? `+${elevationData.elevationZ}` : elevationData.elevationZ}m
                  </span>
                </div>
                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 text-right">
                  <span className="text-[10px] text-slate-500 block uppercase">Gradient Slope</span>
                  <span className={`font-bold ${elevationData.gradientPct > 0 ? 'text-amber-400' : 'text-cyan-400'}`}>
                    {elevationData.slopeText}
                  </span>
                </div>
              </div>
            </div>

            {/* Geofence Unlock / Submission Buttons */}
            <div className="space-y-2">
              {isWithinRadius ? (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setModalInitialMode('CAMERA');
                      setIsModalOpen(true);
                    }}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 font-extrabold text-sm text-slate-950 shadow-lg shadow-emerald-500/25 animate-bounce flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-slate-950" />
                    <span>Geofence Unlocked! Take Photo ({distanceToTarget}m ≤ {activationRadiusMeters}m)</span>
                  </button>

                  <button
                    onClick={() => {
                      setModalInitialMode('GALLERY');
                      setIsModalOpen(true);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-850 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-cyan-400" />
                    <span>Or Select Existing Photo from Phone Gallery / Laptop</span>
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5 text-center">
                  <div className="text-xs text-slate-400">
                    Move within <span className="text-cyan-400 font-mono font-bold">{activationRadiusMeters}m</span> of target coordinates to unlock live camera capture.
                  </div>

                  <button
                    onClick={() => {
                      setModalInitialMode('GALLERY');
                      setIsModalOpen(true);
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                  >
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>Field Issue? Upload Gallery / Laptop Photo</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Clues List Drawer */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="font-bold text-sm text-slate-200">2km Course Clues List</h4>
            
            <div className="space-y-2">
              {course.clues.map((c, idx) => {
                const isCurrent = c.id === activeClue.id;
                const isCompleted = submissions.some(s => s.clueId === c.id);

                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveClueId(c.id)}
                    className={`w-full p-3 rounded-xl text-left transition-all border flex items-center justify-between ${
                      isCurrent
                        ? 'bg-sky-950/80 border-sky-500 text-slate-100 shadow-md'
                        : isCompleted
                        ? 'bg-slate-900/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center font-mono ${
                        isCompleted ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {getWaypointLabel(idx)}
                      </span>
                      <div>
                        <div className="font-bold text-xs">{c.title}</div>
                        <div className="text-[10px] text-slate-400">{c.category}</div>
                      </div>
                    </div>

                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right 2 Columns: GeoLibre Map View */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 h-[520px]">
            <MapLibreView
              center={[activeClue.targetLocation.lng, activeClue.targetLocation.lat]}
              zoom={16}
              startLocation={course.startLocation}
              finishLocation={course.finishLocation}
              clues={course.clues}
              activeClueId={activeClue.id}
              userLocation={userLocation}
              submissions={submissions}
              onSelectClue={(clueId) => {
                setActiveClueId(clueId);
                const cl = course.clues.find(c => c.id === clueId);
                if (cl) setInspectedPoint({ id: cl.id, name: cl.title, lat: cl.targetLocation.lat, lng: cl.targetLocation.lng, type: 'CLUE', data: cl });
              }}
              onInspectPoint={(pt) => {
                setInspectedPoint(pt);
                if (pt.type === 'CLUE') setActiveClueId(pt.id);
              }}
            />
          </div>
        </div>

      </div>

      {/* Submission Modal */}
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
