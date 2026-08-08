import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { getWaypointLabel } from '../../utils/geoUtils';

const BASEMAPS = {
  osm: {
    name: 'OpenStreetMap',
    icon: 'map',
    url: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors | GeoLibre Map Engine'
  },
  satellite: {
    name: 'Satellite Imagery',
    icon: 'satellite_alt',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, Maxar, Earthstar Geographics'
  },
  terrain: {
    name: 'Terrain Topo',
    icon: 'terrain',
    url: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap, SRTM | OpenStreetMap'
  }
};

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
  onUpdateClueLocation = () => {},
  onInspectPoint = () => {},
  onEditClue = () => {}
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // Layer Switcher State
  const [activeBasemap, setActiveBasemap] = useState('osm');
  const [showMapillary, setShowMapillary] = useState(false);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(zoom);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize MapLibre map with selected raster tile basemap
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'base-tiles': {
            type: 'raster',
            tiles: [BASEMAPS.osm.url],
            tileSize: 256,
            attribution: BASEMAPS.osm.attribution
          }
        },
        layers: [
          {
            id: 'base-layer',
            type: 'raster',
            source: 'base-tiles',
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

    // Track zoom level changes for cluster recalculations
    map.on('zoomend', () => {
      setCurrentZoom(Math.round(map.getZoom() * 10) / 10);
    });

    return () => {
      map.remove();
    };
  }, []);

  // Global window handlers for interactive cluster popups
  useEffect(() => {
    window.handleClusterSelect = (type, id) => {
      if (type === 'CLUE') {
        onSelectClue(id);
        const clue = clues.find(c => c.id === id);
        if (clue) onInspectPoint({ id: clue.id, name: clue.title, lat: clue.targetLocation.lat, lng: clue.targetLocation.lng, type: 'CLUE', data: clue });
      } else if (type === 'START' && startLocation) {
        onInspectPoint({ id: 'start', name: startLocation.name, lat: startLocation.lat, lng: startLocation.lng, type: 'START', data: startLocation });
      } else if (type === 'FINISH' && finishLocation) {
        onInspectPoint({ id: 'finish', name: finishLocation.name, lat: finishLocation.lat, lng: finishLocation.lng, type: 'FINISH', data: finishLocation });
      }
    };

    window.handleClusterEdit = (id) => {
      const clue = clues.find(c => c.id === id);
      if (clue && onEditClue) {
        onEditClue(clue);
      }
    };

    window.handleClusterNudge = (type, id) => {
      const offset = 0.0003; // Nudge offset ~30m to separate stacked points & update route polyline
      if (type === 'START' && startLocation) {
        onUpdateStartLocation({
          lat: parseFloat((startLocation.lat + offset).toFixed(6)),
          lng: parseFloat((startLocation.lng + offset).toFixed(6))
        });
      } else if (type === 'FINISH' && finishLocation) {
        onUpdateFinishLocation({
          lat: parseFloat((finishLocation.lat + offset).toFixed(6)),
          lng: parseFloat((finishLocation.lng + offset).toFixed(6))
        });
      } else if (type === 'CLUE') {
        const clue = clues.find(c => c.id === id);
        if (clue) {
          onUpdateClueLocation(id, {
            lat: parseFloat((clue.targetLocation.lat + offset).toFixed(6)),
            lng: parseFloat((clue.targetLocation.lng + offset).toFixed(6))
          });
        }
      }
    };
  }, [clues, startLocation, finishLocation, onSelectClue, onInspectPoint, onEditClue, onUpdateStartLocation, onUpdateFinishLocation, onUpdateClueLocation]);

  // Fly to active clue or center whenever activeClueId or center changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (activeClueId && clues.length > 0) {
      const activeClue = clues.find(c => c.id === activeClueId);
      if (activeClue && activeClue.targetLocation) {
        map.flyTo({
          center: [activeClue.targetLocation.lng, activeClue.targetLocation.lat],
          zoom: 17,
          duration: 1000
        });
        return;
      }
    }

    if (center) {
      map.flyTo({ center: center, zoom: 16, duration: 1000 });
    }
  }, [activeClueId, clues, center]);

  // Handle Basemap Layer Switching (OSM, Satellite, Terrain)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource('base-tiles');
    if (source && BASEMAPS[activeBasemap]) {
      const selected = BASEMAPS[activeBasemap];
      if (map.getLayer('base-layer')) map.removeLayer('base-layer');
      if (map.getSource('base-tiles')) map.removeSource('base-tiles');

      map.addSource('base-tiles', {
        type: 'raster',
        tiles: [selected.url],
        tileSize: 256,
        attribution: selected.attribution
      });

      map.addLayer({
        id: 'base-layer',
        type: 'raster',
        source: 'base-tiles',
        minzoom: 0,
        maxzoom: 19
      }, map.getStyle().layers[0]?.id);
    }
  }, [activeBasemap]);

  // Handle Mapillary Street View Overlay Toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (showMapillary) {
      if (!map.getSource('mapillary-source')) {
        map.addSource('mapillary-source', {
          type: 'raster',
          tiles: [
            'https://raster-tiles.mapillary.com/v3/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '© Mapillary Street View Coverage'
        });
      }

      if (!map.getLayer('mapillary-layer')) {
        map.addLayer({
          id: 'mapillary-layer',
          type: 'raster',
          source: 'mapillary-source',
          paint: { 'raster-opacity': 0.75 }
        });
      }
    } else {
      if (map.getLayer('mapillary-layer')) {
        map.removeLayer('mapillary-layer');
      }
    }
  }, [showMapillary]);

  // Render Clue Markers, Start Marker, Finish Marker & Overlapping Marker Clusters
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Collect all active points
    const points = [];

    if (startLocation && startLocation.lat && startLocation.lng) {
      points.push({
        type: 'START',
        id: 'start-node',
        lat: startLocation.lat,
        lng: startLocation.lng,
        name: startLocation.name || 'Course Start',
        data: startLocation
      });
    }

    if (finishLocation && finishLocation.lat && finishLocation.lng) {
      points.push({
        type: 'FINISH',
        id: 'finish-node',
        lat: finishLocation.lat,
        lng: finishLocation.lng,
        name: finishLocation.name || 'Course Finish',
        data: finishLocation
      });
    }

    clues.forEach((clue, idx) => {
      const label = getWaypointLabel(idx);
      points.push({
        type: 'CLUE',
        id: clue.id,
        lat: clue.targetLocation.lat,
        lng: clue.targetLocation.lng,
        name: `Waypoint ${label}: ${clue.title}`,
        data: clue,
        index: idx
      });
    });

    if (userLocation) {
      const el = document.createElement('div');
      el.className = 'w-6 h-6 rounded-full bg-cyan-400 border-2 border-white shadow-lg shadow-cyan-500/50 animate-pulse flex items-center justify-center';
      el.innerHTML = '<div class="w-2 h-2 rounded-full bg-white"></div>';

      const userMarker = new maplibregl.Marker({ element: el })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map);

      markersRef.current.push(userMarker);
    }

    // Cluster calculation: group points that overlap in screen space (< 40px)
    const clusters = [];
    const processed = new Set();
    const pixelRadiusThreshold = 40;

    points.forEach((pt, i) => {
      if (processed.has(pt.id)) return;

      const screenPos1 = map.project([pt.lng, pt.lat]);
      const clusterGroup = [pt];
      processed.add(pt.id);

      for (let j = i + 1; j < points.length; j++) {
        const otherPt = points[j];
        if (processed.has(otherPt.id)) continue;

        const screenPos2 = map.project([otherPt.lng, otherPt.lat]);
        const dx = screenPos1.x - screenPos2.x;
        const dy = screenPos1.y - screenPos2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < pixelRadiusThreshold) {
          clusterGroup.push(otherPt);
          processed.add(otherPt.id);
        }
      }

      clusters.push(clusterGroup);
    });

    // Render Clusters or Individual Draggable Markers
    clusters.forEach(group => {
      if (group.length > 1) {
        // Render Cluster Badge Marker for Overlapping Icons
        const avgLat = group.reduce((sum, p) => sum + p.lat, 0) / group.length;
        const avgLng = group.reduce((sum, p) => sum + p.lng, 0) / group.length;

        const el = document.createElement('div');
        el.className = 'w-11 h-11 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 border-2 border-white shadow-2xl flex items-center justify-center font-bold text-sm text-white cursor-pointer hover:scale-115 transition-all ring-4 ring-sky-400/40 animate-pulse';
        el.innerText = `${group.length}`;
        el.title = `${group.length} overlapping locations! Click to inspect & select.`;

        const popupContent = `
          <div class="p-2 font-mono text-xs bg-slate-950 text-slate-100 rounded-xl border border-sky-500/40 shadow-2xl max-w-xs">
            <div class="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-800">
              <span class="font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 text-[10px]">
                ${group.length} STACKED POIs
              </span>
              <span class="text-[10px] text-cyan-400">Click Item to Move/Edit</span>
            </div>
            <div class="space-y-2 max-h-48 overflow-y-auto">
              ${group.map(g => `
                <div class="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-sky-500/50 transition-colors">
                  <div class="font-bold text-xs text-sky-200 truncate">${g.name}</div>
                  <div class="text-[10px] text-slate-400 font-mono mt-0.5">${g.lat.toFixed(5)}°, ${g.lng.toFixed(5)}°</div>
                  <div class="flex items-center gap-1.5 mt-2">
                    <button
                      type="button"
                      onclick="window.handleClusterSelect('${g.type}', '${g.id}')"
                      class="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] cursor-pointer"
                    >
                      Select
                    </button>
                    ${g.type === 'CLUE' ? `
                      <button
                        type="button"
                        onclick="window.handleClusterEdit('${g.id}')"
                        class="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] cursor-pointer"
                      >
                        Edit
                      </button>
                    ` : ''}
                    <button
                      type="button"
                      onclick="window.handleClusterNudge('${g.type}', '${g.id}')"
                      class="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[10px] cursor-pointer"
                      title="Offset coordinates slightly to separate stacked markers & move route polyline"
                    >
                      Unstack & Move Line
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;

        const clusterMarker = new maplibregl.Marker({ element: el })
          .setLngLat([avgLng, avgLat])
          .setPopup(new maplibregl.Popup({ offset: 25, closeButton: true, closeOnClick: false }).setHTML(popupContent))
          .addTo(map);

        markersRef.current.push(clusterMarker);
      } else {
        // Render Individual Draggable Marker
        const pt = group[0];

        if (pt.type === 'START') {
          const el = document.createElement('div');
          el.className = 'w-9 h-9 rounded-full bg-amber-500 border-2 border-white shadow-xl flex items-center justify-center font-bold text-xs text-slate-950 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform';
          el.title = 'Drag on map to reposition Start Location';
          el.innerHTML = '<span class="material-symbols-outlined text-[20px]">flag</span>';

          el.onclick = () => {
            if (onInspectPoint) onInspectPoint(pt);
          };

          const startMarker = new maplibregl.Marker({ element: el, draggable: true })
            .setLngLat([pt.lng, pt.lat])
            .setPopup(
              new maplibregl.Popup({ offset: 25 }).setHTML(`
                <div class="p-1">
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">START LOCATION (DRAGGABLE)</span>
                  <h4 class="font-bold text-sm mt-1 text-slate-100">${pt.name}</h4>
                  <div class="mt-1 text-xs font-mono text-cyan-400">Activation Zone: ${pt.data.activationRadiusMeters || 100}m</div>
                  <div class="text-[10px] font-mono text-slate-400 mt-0.5">${pt.lat.toFixed(5)}°, ${pt.lng.toFixed(5)}°</div>
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
        } else if (pt.type === 'FINISH') {
          const el = document.createElement('div');
          el.className = 'w-9 h-9 rounded-full bg-rose-600 border-2 border-white shadow-xl flex items-center justify-center font-bold text-xs text-white cursor-grab active:cursor-grabbing hover:scale-110 transition-transform';
          el.title = 'Drag on map to reposition Finish Location';
          el.innerHTML = '<span class="material-symbols-outlined text-[20px]">sports_score</span>';
          el.onclick = () => {
            if (onInspectPoint) onInspectPoint(pt);
          };

          const finishMarker = new maplibregl.Marker({ element: el, draggable: true })
            .setLngLat([pt.lng, pt.lat])
            .setPopup(
              new maplibregl.Popup({ offset: 25 }).setHTML(`
                <div class="p-1">
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">FINISH LOCATION (DRAGGABLE)</span>
                  <h4 class="font-bold text-sm mt-1 text-slate-100">${pt.name}</h4>
                  <div class="text-[10px] font-mono text-slate-400 mt-1">${pt.lat.toFixed(5)}°, ${pt.lng.toFixed(5)}°</div>
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
        } else if (pt.type === 'CLUE') {
          const clue = pt.data;
          const label = getWaypointLabel(pt.index !== undefined ? pt.index : clue.number - 1);
          const isActive = clue.id === activeClueId;
          const isCompleted = submissions.some(s => s.clueId === clue.id);

          const el = document.createElement('div');
          el.className = `w-10 h-10 rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center font-bold text-sm shadow-xl transition-transform hover:scale-110 font-mono ${
            isCompleted
              ? 'bg-emerald-500 text-white border-2 border-emerald-300'
              : isActive
              ? 'bg-sky-500 text-white border-2 border-white ring-4 ring-sky-400/40 animate-bounce'
              : 'bg-slate-800 text-slate-200 border-2 border-slate-600'
          }`;
          el.innerText = label;
          el.title = `Waypoint ${label} (Drag on map to reposition)`;
          el.onclick = () => {
            onSelectClue(clue.id);
            if (onInspectPoint) onInspectPoint(pt);
          };

          const markerRadius = clue.targetRadiusMeters || startLocation?.activationRadiusMeters || 100;

          const marker = new maplibregl.Marker({ element: el, draggable: true })
            .setLngLat([clue.targetLocation.lng, clue.targetLocation.lat])
            .setPopup(
              new maplibregl.Popup({ offset: 25 }).setHTML(`
                <div class="p-1 max-w-[220px]">
                  <span class="text-xs font-semibold px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">${clue.category}</span>
                  <h4 class="font-bold text-base mt-1 text-slate-100">Waypoint ${label}: ${clue.title}</h4>
                  ${clue.referencePhotoUrl ? `
                    <div className="my-2 rounded-lg overflow-hidden border border-slate-700">
                      <img src="${clue.referencePhotoUrl}" alt="${clue.title}" class="w-full h-24 object-cover rounded-lg mt-1 border border-slate-700" />
                    </div>
                  ` : ''}
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
        }
      }
    });

    // Render Line of Sight (LOS) Vector & Walking Route Polylines
    const updateGeoJSONLayers = () => {
      if (!map || !map.getStyle()) return;

      // A) Line of Sight (Dashed Line)
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

      // B) Walking Route Polyline
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

  }, [startLocation, finishLocation, clues, activeClueId, userLocation, submissions, currentZoom]);

  return (
    <div className="relative w-full h-full min-h-[350px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      <div ref={mapContainerRef} className="w-full h-full min-h-[350px]" />
      
      {/* GeoLibre Open-Source Mapping & Layer Badge */}
      <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-sky-500/30 flex items-center gap-2 text-xs font-mono text-sky-300 shadow-lg z-10">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        <span>GeoLibre Engine ({BASEMAPS[activeBasemap].name})</span>
      </div>

      {/* Floating Basemap & Mapillary Layer Switcher */}
      <div className="absolute top-3 right-14 z-20">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
            className="w-10 h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-sky-400 border border-sky-500/40 shadow-2xl flex items-center justify-center font-bold backdrop-blur-md cursor-pointer transition-all hover:scale-105 active:scale-95"
            title="Standard Layer Switcher & Mapillary Street View"
          >
            <span className="material-symbols-outlined text-[22px]">layers</span>
          </button>

          {isLayerMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-950/95 backdrop-blur-xl border border-sky-500/40 rounded-2xl p-3 shadow-2xl text-xs space-y-3 z-30">
              <div className="font-bold text-sky-300 uppercase tracking-wider font-mono text-[10px]">Basemap Selector</div>
              
              <div className="space-y-1">
                {Object.entries(BASEMAPS).map(([key, bm]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setActiveBasemap(key);
                      setIsLayerMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 font-semibold transition-all cursor-pointer ${
                      activeBasemap === key
                        ? 'bg-sky-500 text-white font-bold shadow-md'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">{bm.icon}</span>
                    <span>{bm.name}</span>
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-800">
                <div className="font-bold text-sky-300 uppercase tracking-wider font-mono text-[10px] mb-1.5">Overlays & Street View</div>
                <button
                  type="button"
                  onClick={() => setShowMapillary(!showMapillary)}
                  className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between font-semibold transition-all cursor-pointer ${
                    showMapillary
                      ? 'bg-emerald-600 text-white font-bold shadow-md'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">streetview</span>
                    <span>Mapillary Street View</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900">{showMapillary ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
