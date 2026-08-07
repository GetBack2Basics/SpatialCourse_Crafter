// GeoLibre-Inspired MapLibre GL JS Component for Open-Source Mapping

import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

export default function MapLibreView({
  center = [145.7781, -16.9186], // [lng, lat] for MapLibre
  zoom = 15,
  clues = [],
  activeClueId = null,
  userLocation = null,
  submissions = [],
  onSelectClue = () => {}
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize MapLibre map with OpenStreetMap / Carto DB raster tiles
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors | GeoLibre Map Engine'
          }
        },
        layers: [
          {
            id: 'osm-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: center,
      zoom: zoom
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, []);

  // Update center when active clue changes
  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.flyTo({ center: center, zoom: 16, duration: 1200 });
    }
  }, [center]);

  // Render Clue Markers & User Location Pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // 1. Render User Location Pin
    if (userLocation) {
      const el = document.createElement('div');
      el.className = 'w-6 h-6 rounded-full bg-cyan-400 border-2 border-white shadow-lg shadow-cyan-500/50 animate-pulse flex items-center justify-center';
      el.innerHTML = '<div class="w-2 h-2 rounded-full bg-white"></div>';

      const userMarker = new maplibregl.Marker({ element: el })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map);

      markersRef.current.push(userMarker);
    }

    // 2. Render Course Clue Markers
    clues.forEach(clue => {
      const isActive = clue.id === activeClueId;
      const isCompleted = submissions.some(s => s.clueId === clue.id);

      const el = document.createElement('div');
      el.className = `w-10 h-10 rounded-full cursor-pointer flex items-center justify-center font-bold text-sm shadow-xl transition-transform hover:scale-110 ${
        isCompleted
          ? 'bg-emerald-500 text-white border-2 border-emerald-300'
          : isActive
          ? 'bg-sky-500 text-white border-2 border-white ring-4 ring-sky-400/40 animate-bounce'
          : 'bg-slate-800 text-slate-200 border-2 border-slate-600'
      }`;
      el.innerText = clue.number;
      el.onclick = () => onSelectClue(clue.id);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([clue.targetLocation.lng, clue.targetLocation.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(`
            <div class="p-1">
              <span class="text-xs font-semibold px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">${clue.category}</span>
              <h4 class="font-bold text-base mt-1 text-slate-100">Clue #${clue.number}: ${clue.title}</h4>
              <p class="text-xs text-slate-300 mt-1">${clue.description}</p>
              <div class="mt-2 text-xs font-mono text-cyan-400">Target Radius: ${clue.targetRadiusMeters}m</div>
            </div>
          `)
        )
        .addTo(map);

      markersRef.current.push(marker);
    });

  }, [clues, activeClueId, userLocation, submissions]);

  return (
    <div className="relative w-full h-full min-h-[350px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      <div ref={mapContainerRef} className="w-full h-full min-h-[350px]" />
      
      {/* GeoLibre Open-Source Mapping Badge */}
      <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-sky-500/30 flex items-center gap-2 text-xs font-mono text-sky-300 shadow-lg z-10">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        <span>GeoLibre OSM Vector Engine</span>
      </div>
    </div>
  );
}
