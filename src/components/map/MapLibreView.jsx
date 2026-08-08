// GeoLibre-Inspired MapLibre GL JS Component for Open-Source Mapping

import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

export default function MapLibreView({
  center = [145.7781, -16.9186], // [lng, lat] for MapLibre
  zoom = 15,
  startLocation = null,
  finishLocation = null,
  clues = [],
  activeClueId = null,
  userLocation = null,
  submissions = [],
  onSelectClue = () => {},
  onUpdateStartLocation = () => {},
  onUpdateFinishLocation = () => {},
  onUpdateClueLocation = () => {}
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

  // Render Clue Markers, Start Marker, Finish Marker & User Location Pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // 0a. Render Start Location Marker (Draggable)
    if (startLocation && startLocation.lat && startLocation.lng) {
      const el = document.createElement('div');
      el.className = 'w-9 h-9 rounded-full bg-amber-500 border-2 border-white shadow-xl flex items-center justify-center font-bold text-xs text-slate-950 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform';
      el.title = 'Drag on map to reposition Start Location';
      el.innerHTML = '<span class="material-symbols-outlined text-[20px]">flag</span>';

      const startMarker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat([startLocation.lng, startLocation.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(`
            <div class="p-1">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">START LOCATION (DRAGGABLE)</span>
              <h4 class="font-bold text-sm mt-1 text-slate-100">${startLocation.name || 'Course Start'}</h4>
              <div class="mt-1 text-xs font-mono text-cyan-400">Activation Zone: ${startLocation.activationRadiusMeters || 100}m</div>
              <div class="text-[10px] font-mono text-slate-400 mt-0.5">${startLocation.lat.toFixed(5)}°, ${startLocation.lng.toFixed(5)}°</div>
              <p class="text-[10px] text-amber-400 mt-1 italic">Drag marker to reposition Start location!</p>
            </div>
          `)
        )
        .addTo(map);

      startMarker.on('dragend', () => {
        const lngLat = startMarker.getLngLat();
        onUpdateStartLocation({
          lat: parseFloat(lngLat.lat.toFixed(6)),
          lng: parseFloat(lngLat.lng.toFixed(6))
        });
      });

      markersRef.current.push(startMarker);
    }

    // 0b. Render Finish Location Marker (Draggable)
    if (finishLocation && finishLocation.lat && finishLocation.lng) {
      const el = document.createElement('div');
      el.className = 'w-9 h-9 rounded-full bg-rose-600 border-2 border-white shadow-xl flex items-center justify-center font-bold text-xs text-white cursor-grab active:cursor-grabbing hover:scale-110 transition-transform';
      el.title = 'Drag on map to reposition Finish Location';
      el.innerHTML = '<span class="material-symbols-outlined text-[20px]">sports_score</span>';

      const finishMarker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat([finishLocation.lng, finishLocation.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(`
            <div class="p-1">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">FINISH LOCATION (DRAGGABLE)</span>
              <h4 class="font-bold text-sm mt-1 text-slate-100">${finishLocation.name || 'Course Finish'}</h4>
              <div class="text-[10px] font-mono text-slate-400 mt-1">${finishLocation.lat.toFixed(5)}°, ${finishLocation.lng.toFixed(5)}°</div>
              <p class="text-[10px] text-rose-400 mt-1 italic">Drag marker to reposition Finish location!</p>
            </div>
          `)
        )
        .addTo(map);

      finishMarker.on('dragend', () => {
        const lngLat = finishMarker.getLngLat();
        onUpdateFinishLocation({
          lat: parseFloat(lngLat.lat.toFixed(6)),
          lng: parseFloat(lngLat.lng.toFixed(6))
        });
      });

      markersRef.current.push(finishMarker);
    }

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

    // 2. Render Course Clue Markers (Draggable)
    clues.forEach(clue => {
      const isActive = clue.id === activeClueId;
      const isCompleted = submissions.some(s => s.clueId === clue.id);

      const el = document.createElement('div');
      el.className = `w-10 h-10 rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center font-bold text-sm shadow-xl transition-transform hover:scale-110 ${
        isCompleted
          ? 'bg-emerald-500 text-white border-2 border-emerald-300'
          : isActive
          ? 'bg-sky-500 text-white border-2 border-white ring-4 ring-sky-400/40 animate-bounce'
          : 'bg-slate-800 text-slate-200 border-2 border-slate-600'
      }`;
      el.innerText = clue.number;
      el.title = `Waypoint #${clue.number} (Drag on map to reposition)`;
      el.onclick = () => onSelectClue(clue.id);

      const markerRadius = clue.targetRadiusMeters || startLocation?.activationRadiusMeters || 100;

      const marker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat([clue.targetLocation.lng, clue.targetLocation.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(`
            <div class="p-1">
              <span class="text-xs font-semibold px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">${clue.category}</span>
              <h4 class="font-bold text-base mt-1 text-slate-100">Clue #${clue.number}: ${clue.title}</h4>
              <p class="text-xs text-slate-300 mt-1">${clue.description}</p>
              <div class="mt-2 text-xs font-mono text-cyan-400">Activation Zone: ${markerRadius}m</div>
              <p class="text-[10px] text-cyan-400 mt-1 italic">Drag marker to reposition waypoint</p>
            </div>
          `)
        )
        .addTo(map);

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        onUpdateClueLocation(clue.id, {
          lat: parseFloat(lngLat.lat.toFixed(6)),
          lng: parseFloat(lngLat.lng.toFixed(6))
        });
      });

      markersRef.current.push(marker);
    });

    // 3. Render Line of Sight (LOS) Vector & Walking Route Polylines
    const updateGeoJSONLayers = () => {
      if (!map || !map.getStyle()) return;

      // A) Line of Sight (Dashed Line): User Location / Start -> Active Waypoint
      const activeClue = clues.find(c => c.id === activeClueId) || clues[0];
      const targetPoint = activeClue ? activeClue.targetLocation : (startLocation || { lat: center[1], lng: center[0] });
      const originPoint = userLocation || startLocation;

      if (originPoint && targetPoint && (originPoint.lat !== targetPoint.lat || originPoint.lng !== targetPoint.lng)) {
        const losData = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: [
                  [originPoint.lng, originPoint.lat],
                  [targetPoint.lng, targetPoint.lat]
                ]
              }
            }
          ]
        };

        if (map.getSource('los-source')) {
          map.getSource('los-source').setData(losData);
        } else {
          map.addSource('los-source', { type: 'geojson', data: losData });
          map.addLayer({
            id: 'los-layer',
            type: 'line',
            source: 'los-source',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-color': '#06b6d4',
              'line-width': 3.5,
              'line-dasharray': [2, 2]
            }
          });
        }
      }

      // B) Walking Route Polyline: Start Location -> Clue 1 -> Clue 2 -> Clue 3... -> Finish Location
      if (startLocation && startLocation.lat && startLocation.lng && clues.length > 0) {
        const routeCoords = [
          [startLocation.lng, startLocation.lat],
          ...clues.map(c => [c.targetLocation.lng, c.targetLocation.lat])
        ];

        if (finishLocation && finishLocation.lat && finishLocation.lng) {
          routeCoords.push([finishLocation.lng, finishLocation.lat]);
        }

        const routeData = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: routeCoords
              }
            }
          ]
        };

        if (map.getSource('route-source')) {
          map.getSource('route-source').setData(routeData);
        } else {
          map.addSource('route-source', { type: 'geojson', data: routeData });
          map.addLayer({
            id: 'route-layer-glow',
            type: 'line',
            source: 'route-source',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-color': '#059669',
              'line-width': 8,
              'line-opacity': 0.35
            }
          });
          map.addLayer({
            id: 'route-layer',
            type: 'line',
            source: 'route-source',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-color': '#10b981',
              'line-width': 4
            }
          });
        }
      }
    };

    if (map.isStyleLoaded()) {
      updateGeoJSONLayers();
    } else {
      map.once('load', updateGeoJSONLayers);
    }

  }, [startLocation, finishLocation, clues, activeClueId, userLocation, submissions]);

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
