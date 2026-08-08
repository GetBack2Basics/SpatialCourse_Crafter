import React, { useState, useEffect } from 'react';
import { Navigation, Compass, MapPin, CheckCircle2, Clock, Users, ArrowUpRight, Camera, AlertCircle } from 'lucide-react';
import MapLibreView from '../map/MapLibreView';
import SubmissionModal from './SubmissionModal';
import { calculateHaversineDistance, calculateBearing, getWaypointLabel } from '../../utils/geoUtils';

export default function ClueRunner({ course, activeTeam, submissions = [], onSubmitData }) {
  const [activeClueId, setActiveClueId] = useState(course.clues[0]?.id);
  const [userLocation, setUserLocation] = useState(course.startLocation);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const activeClue = course.clues.find(c => c.id === activeClueId) || course.clues[0];

  // REAL Native HTML5 Geolocation Watcher
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
          name: "Real Device Location"
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

  // Calculate real Haversine distance & compass bearing
  const distanceToTarget = calculateHaversineDistance(
    userLocation.lat, userLocation.lng,
    activeClue.targetLocation.lat, activeClue.targetLocation.lng
  );

  const bearingToTarget = calculateBearing(
    userLocation.lat, userLocation.lng,
    activeClue.targetLocation.lat, activeClue.targetLocation.lng
  );

  const activationRadiusMeters = activeClue.targetRadiusMeters || course.startLocation?.activationRadiusMeters || 100;
  const isWithinRadius = distanceToTarget <= activationRadiusMeters;

  return (
    <div className="space-y-6">
      
      {/* Real HTML5 Geolocation Status Bar */}
      <div className="glass-panel p-3.5 rounded-2xl border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-950/80">
        <div className="flex items-center gap-2 font-mono text-cyan-400">
          <Navigation className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>REAL HTML5 GPS TRACKER:</span>
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
          
          {/* Active Target Compass & HUD Card */}
          <div className="glass-panel-glow p-5 rounded-3xl border border-sky-500/40 relative overflow-hidden space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800">
                ACTIVE TARGET #{activeClue.number}
              </span>
              <span className="text-xs font-bold text-amber-300 font-mono">{activeClue.points} PTS</span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-100">{activeClue.title}</h3>
              <p className="text-xs text-slate-400 mt-1">{activeClue.description}</p>
            </div>

            {/* Distance & Bearing Meter */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between font-mono">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-sky-400" style={{ transform: `rotate(${bearingToTarget}deg)` }} />
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Real Distance</div>
                  <div className="text-base font-bold text-slate-200">{distanceToTarget}m</div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-slate-500 uppercase">Activation Zone</div>
                <div className="text-sm font-semibold text-cyan-400">{activationRadiusMeters}m</div>
              </div>
            </div>

            {/* Geofence Unlock / Submission Button */}
            {isWithinRadius ? (
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 font-extrabold text-sm text-slate-950 shadow-lg shadow-emerald-500/25 animate-bounce flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Geofence Unlocked! ({distanceToTarget}m ≤ {activationRadiusMeters}m)</span>
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
                Move within <span className="text-cyan-400 font-mono font-bold">{activationRadiusMeters}m</span> of target coordinates to unlock data collection.
              </div>
            )}
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
              onSelectClue={setActiveClueId}
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
        onClose={() => setIsModalOpen(false)}
        onSubmit={onSubmitData}
      />

    </div>
  );
}
