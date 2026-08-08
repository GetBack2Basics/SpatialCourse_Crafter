import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { parseCoordinates } from '../../utils/geoUtils';
import { Search, MapPin, Navigation, CheckCircle2 } from 'lucide-react';

export default function MapLocationPicker({
  lat = -33.0372,
  lng = 151.5945,
  onChangeLocation,
  height = '260px'
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const [currentLat, setCurrentLat] = useState(lat);
  const [currentLng, setCurrentLng] = useState(lng);

  // Sync internal state when props change externally
  useEffect(() => {
    setCurrentLat(lat);
    setCurrentLng(lng);
    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
    }
    if (mapRef.current) {
      mapRef.current.easeTo({ center: [lng, lat] });
    }
  }, [lat, lng]);

  // Initialize MapLibre interactive picker
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialCenter = [lng, lat];
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
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
      center: initialCenter,
      zoom: 15
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;

    // Custom Draggable Pin Element
    const el = document.createElement('div');
    el.className = 'w-9 h-9 rounded-full bg-cyan-500 border-2 border-white shadow-2xl flex items-center justify-center font-bold text-slate-950 cursor-grab active:cursor-grabbing hover:scale-115 transition-transform ring-4 ring-cyan-400/40 animate-pulse';
    el.innerHTML = '<span class="material-symbols-outlined text-[20px]">location_on</span>';

    const marker = new maplibregl.Marker({ element: el, draggable: true })
      .setLngLat(initialCenter)
      .addTo(map);

    markerRef.current = marker;

    // Handle marker dragend
    marker.on('dragend', () => {
      const lngLat = marker.getLngLat();
      const newLat = parseFloat(lngLat.lat.toFixed(6));
      const newLng = parseFloat(lngLat.lng.toFixed(6));
      setCurrentLat(newLat);
      setCurrentLng(newLng);
      if (onChangeLocation) {
        onChangeLocation({ lat: newLat, lng: newLng });
      }
    });

    // Handle map click to place pin
    map.on('click', (e) => {
      const newLat = parseFloat(e.lngLat.lat.toFixed(6));
      const newLng = parseFloat(e.lngLat.lng.toFixed(6));
      marker.setLngLat([newLng, newLat]);
      setCurrentLat(newLat);
      setCurrentLng(newLng);
      if (onChangeLocation) {
        onChangeLocation({ lat: newLat, lng: newLng });
      }
    });

    return () => {
      map.remove();
    };
  }, []);

  // Search & Geocoding Autocomplete Lookup
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Check if raw coordinates or maps URL first
    const parsed = parseCoordinates(searchQuery);
    if (parsed) {
      setSuggestions([{
        display_name: `Coordinates: ${parsed.lat.toFixed(5)}°, ${parsed.lng.toFixed(5)}°`,
        lat: parsed.lat,
        lng: parsed.lng
      }]);
      setShowSuggestions(true);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          const formatted = data.map(item => ({
            display_name: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          }));
          setSuggestions(formatted);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.warn("Location search notice:", err.message);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSuggestion = (sug) => {
    setSearchQuery(sug.display_name);
    setShowSuggestions(false);
    setCurrentLat(sug.lat);
    setCurrentLng(sug.lng);

    if (markerRef.current) {
      markerRef.current.setLngLat([sug.lng, sug.lat]);
    }
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [sug.lng, sug.lat], zoom: 17 });
    }

    if (onChangeLocation) {
      onChangeLocation({ lat: sug.lat, lng: sug.lng, addressName: sug.display_name });
    }
  };

  const handleUseDeviceLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = parseFloat(pos.coords.latitude.toFixed(6));
        const newLng = parseFloat(pos.coords.longitude.toFixed(6));
        setCurrentLat(newLat);
        setCurrentLng(newLng);
        setIsLocating(false);

        if (markerRef.current) {
          markerRef.current.setLngLat([newLng, newLat]);
        }
        if (mapRef.current) {
          mapRef.current.flyTo({ center: [newLng, newLat], zoom: 17 });
        }

        if (onChangeLocation) {
          onChangeLocation({ lat: newLat, lng: newLng, addressName: "Current GPS Location" });
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn("GPS lookup notice:", err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-2 font-body">
      {/* Search Input Bar */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search place, address, landmark, or coordinates..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 3 && setShowSuggestions(true)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500 font-mono shadow-inner"
            />
            <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <button
            type="button"
            onClick={handleUseDeviceLocation}
            disabled={isLocating}
            title="Use current device GPS location"
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
          >
            <Navigation className={`w-3.5 h-3.5 text-cyan-400 ${isLocating ? 'animate-spin' : ''}`} />
            <span>GPS</span>
          </button>
        </div>

        {/* Search Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSuggestion(s)}
                className="w-full p-2.5 text-left text-xs font-mono text-slate-200 hover:bg-cyan-950/80 border-b border-slate-900 flex items-start gap-2 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span className="truncate">{s.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Map Canvas Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-md group">
        <div ref={mapContainerRef} style={{ height }} className="w-full bg-slate-950" />
        
        {/* Banner Overlay */}
        <div className="absolute top-2 left-2 right-2 pointer-events-none bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-mono text-slate-300 border border-slate-800 flex items-center justify-between shadow-lg">
          <span className="flex items-center gap-1 text-cyan-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            Click map or drag pin to choose point
          </span>
          <span className="text-slate-400">
            {currentLat.toFixed(5)}°, {currentLng.toFixed(5)}°
          </span>
        </div>
      </div>
    </div>
  );
}
