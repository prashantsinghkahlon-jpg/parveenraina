import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  RotateCcw, 
  Clock, 
  Navigation, 
  MapPin, 
  Camera, 
  Activity, 
  Sliders, 
  User as UserIcon,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { LocationRecord, FieldVisit, WorkSession, User, AdminSettings } from '../../types';
import { ApiService } from '../../services/api';
import { createConfiguredTileLayer, configureMapWatermarks } from '../../utils/mapTiles';

interface RoutePlaybackProps {
  executives: User[];
  initialExecutiveId?: string;
  onClose?: () => void;
  onViewPhoto: (photoUrl: string) => void;
}

export const RoutePlayback: React.FC<RoutePlaybackProps> = ({
  executives,
  initialExecutiveId,
  onClose,
  onViewPhoto,
}) => {
  const [selectedExecutiveId, setSelectedExecutiveId] = useState<string>(
    initialExecutiveId || executives[0]?.id || ''
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [visits, setVisits] = useState<FieldVisit[]>([]);
  const [session, setSession] = useState<WorkSession | null>(null);
  const [totalDistanceKm, setTotalDistanceKm] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Playback state
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x, 5x, 10x

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polylineLayerRef = useRef<L.Polyline | null>(null);
  const movingMarkerRef = useRef<L.Marker | null>(null);
  const stopsLayerRef = useRef<L.LayerGroup | null>(null);

  // Fetch route history
  const loadRouteData = async () => {
    if (!selectedExecutiveId) return;
    setIsLoading(true);
    try {
      const data = await ApiService.getRouteHistory(selectedExecutiveId, selectedDate);
      setLocations(data.locations || []);
      setVisits(data.visits || []);
      setSession(data.session || null);
      setTotalDistanceKm(data.totalDistanceKm || 0);
      setCurrentIndex(0);
      setIsPlaying(false);
    } catch (err) {
      console.warn('Failed to load route history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRouteData();
  }, [selectedExecutiveId, selectedDate]);

  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    ApiService.getSettings()
      .then((st) => setAdminSettings(st))
      .catch((e) => console.warn('Failed to load map settings in RoutePlayback:', e));
  }, []);

  // Init Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [37.7749, -122.4194],
        zoom: 13,
      });

      if (map.attributionControl) {
        map.attributionControl.setPrefix(false);
      }
      configureMapWatermarks(map, adminSettings);

      const initialTile = createConfiguredTileLayer(adminSettings);
      initialTile.addTo(map);
      tileLayerRef.current = initialTile;

      stopsLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }
  }, []);

  // Update Tile Layer when AdminSettings change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    configureMapWatermarks(map, adminSettings);

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }
    const newTile = createConfiguredTileLayer(adminSettings);
    newTile.addTo(map);
    tileLayerRef.current = newTile;
  }, [adminSettings]);

  // Update map polyline and markers when locations change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const stopsLayer = stopsLayerRef.current;
    if (!map || !stopsLayer) return;

    stopsLayer.clearLayers();
    if (polylineLayerRef.current) {
      polylineLayerRef.current.remove();
      polylineLayerRef.current = null;
    }
    if (movingMarkerRef.current) {
      movingMarkerRef.current.remove();
      movingMarkerRef.current = null;
    }

    if (locations.length === 0) return;

    const latLngs: [number, number][] = locations.map(l => [l.latitude, l.longitude]);

    // 1. Draw route polyline
    const polyline = L.polyline(latLngs, {
      color: '#0284c7',
      weight: 5,
      opacity: 0.85,
      dashArray: '8, 8',
      lineJoin: 'round',
    }).addTo(map);
    polylineLayerRef.current = polyline;

    // 2. Start Marker (Green)
    const startLoc = locations[0];
    const startIcon = L.divIcon({
      className: 'start-marker',
      html: `
        <div style="
          background: #10b981;
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-weight: 800;
          font-size: 10px;
          border: 2px solid white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          white-space: nowrap;
        ">
          🏁 START (${new Date(startLoc.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
        </div>
      `,
      iconSize: [80, 24],
      iconAnchor: [40, 12],
    });
    L.marker([startLoc.latitude, startLoc.longitude], { icon: startIcon }).addTo(stopsLayer);

    // 3. Field Visits / Stops along the route
    visits.forEach((v, idx) => {
      const visitIcon = L.divIcon({
        className: 'visit-stop-marker',
        html: `
          <div style="
            background: #0d9488;
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 10px;
            border: 2px solid white;
            box-shadow: 0 4px 10px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
            white-space: nowrap;
          ">
            📷 Stop #${idx + 1}: ${v.visitName.slice(0, 14)}...
          </div>
        `,
        iconSize: [120, 24],
        iconAnchor: [60, 12],
      });

      const visitMarker = L.marker([v.latitude, v.longitude], { icon: visitIcon });
      visitMarker.bindPopup(`
        <div style="font-family: sans-serif; min-width: 200px;">
          <strong style="font-size: 13px;">${v.visitName}</strong>
          <p style="font-size: 11px; color: #64748b; margin: 4px 0;">${v.locationName || 'Field Visit'}</p>
          <div style="font-size: 10px; font-family: monospace; background: #f1f5f9; padding: 4px; border-radius: 4px; margin-bottom: 6px;">
            ${new Date(v.capturedAt).toLocaleTimeString()} &bull; Lat: ${v.latitude.toFixed(5)}, Lng: ${v.longitude.toFixed(5)}
          </div>
          ${v.photoUrl ? `<img src="${v.photoUrl}" style="width: 100%; border-radius: 6px; margin-bottom: 6px;" />` : ''}
          ${v.remarks ? `<p style="font-size: 11px; font-style: italic;">"${v.remarks}"</p>` : ''}
        </div>
      `);
      stopsLayer.addLayer(visitMarker);
    });

    // 4. Moving Executive Marker
    const movingIcon = L.divIcon({
      className: 'moving-marker',
      html: `
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #38bdf8;
          border: 3px solid #ffffff;
          box-shadow: 0 0 16px #38bdf8, 0 4px 12px rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0f172a;
          font-weight: 900;
          font-size: 14px;
        ">
          ⚡
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const movingMarker = L.marker(latLngs[0], { icon: movingIcon, zIndexOffset: 1000 }).addTo(map);
    movingMarkerRef.current = movingMarker;

    // Fit map bounds
    map.fitBounds(polyline.getBounds(), { padding: [60, 60], maxZoom: 15 });
  }, [locations, visits]);

  // Update Moving Marker position when currentIndex changes
  useEffect(() => {
    if (locations.length === 0 || !movingMarkerRef.current) return;
    const currentLoc = locations[currentIndex];
    if (currentLoc) {
      movingMarkerRef.current.setLatLng([currentLoc.latitude, currentLoc.longitude]);
    }
  }, [currentIndex, locations]);

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = Math.max(150, Math.floor(1200 / playbackSpeed));
    const timer = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= locations.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, locations.length]);

  const currentPoint = locations[currentIndex] || null;

  return (
    <div className="space-y-4 text-slate-800">
      {/* Top Filter & Control Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Executive & Date selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
              Select Field Executive
            </label>
            <select
              value={selectedExecutiveId}
              onChange={(e) => setSelectedExecutiveId(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
            >
              {executives.map(exec => (
                <option key={exec.id} value={exec.id}>
                  {exec.name} ({exec.employeeId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Route Stats Summary */}
        <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block">Total Distance</span>
            <span className="text-sm font-bold text-blue-600 font-mono">{totalDistanceKm} km</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block">Recorded Points</span>
            <span className="text-sm font-bold text-slate-800 font-mono">{locations.length}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block">Field Visits</span>
            <span className="text-sm font-bold text-green-600 font-mono">{visits.length}</span>
          </div>
        </div>
      </div>

      {/* Map Replay Stage */}
      <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100">
        <div ref={mapContainerRef} className="w-full h-full z-10 clean-map-tiles" />

        {/* Active Point Live Telemetry HUD Overlay */}
        {currentPoint && (
          <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200 shadow-lg space-y-1.5 text-xs text-slate-700 min-w-[240px]">
            <div className="flex items-center justify-between text-blue-600 font-bold">
              <span>Point #{currentIndex + 1} of {locations.length}</span>
              <span className="font-mono text-[11px] text-slate-600">
                {new Date(currentPoint.capturedAt).toLocaleTimeString()}
              </span>
            </div>
            <div className="font-mono text-[11px] text-slate-500">
              Lat: {currentPoint.latitude.toFixed(5)}, Lng: {currentPoint.longitude.toFixed(5)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
              <span>Speed: <strong className="text-slate-900">{Math.round(currentPoint.speed || 0)} km/h</strong></span>
              <span>Accuracy: <strong className="text-green-600">&plusmn;{Math.round(currentPoint.accuracy)}m</strong></span>
            </div>
            {currentPoint.locationName && (
              <p className="text-[11px] text-blue-700 font-semibold truncate max-w-[220px]">
                📍 {currentPoint.locationName}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Playback Control Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        {/* Timeline Scrubber Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-500 font-mono">
            <span>
              {locations[0] ? new Date(locations[0].capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Start'}
            </span>
            <span className="text-blue-600 font-bold">
              {currentPoint ? new Date(currentPoint.capturedAt).toLocaleTimeString() : '--:--'}
            </span>
            <span>
              {locations[locations.length - 1] ? new Date(locations[locations.length - 1].capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'End'}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0, locations.length - 1)}
            value={currentIndex}
            onChange={(e) => {
              setCurrentIndex(Number(e.target.value));
              setIsPlaying(false);
            }}
            disabled={locations.length === 0}
            className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer disabled:opacity-40"
          />
        </div>

        {/* Buttons & Speed controls */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {/* Step Prev */}
            <button
              onClick={() => {
                setCurrentIndex(prev => Math.max(0, prev - 1));
                setIsPlaying(false);
              }}
              disabled={currentIndex === 0 || locations.length === 0}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 flex items-center justify-center border border-slate-200 transition-colors"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Play / Pause Primary Button */}
            <button
              onClick={() => {
                if (currentIndex >= locations.length - 1) {
                  setCurrentIndex(0);
                }
                setIsPlaying(!isPlaying);
              }}
              disabled={locations.length === 0}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY REPLAY'}</span>
            </button>

            {/* Step Next */}
            <button
              onClick={() => {
                setCurrentIndex(prev => Math.min(locations.length - 1, prev + 1));
                setIsPlaying(false);
              }}
              disabled={currentIndex >= locations.length - 1 || locations.length === 0}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 flex items-center justify-center border border-slate-200 transition-colors"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Reset to Start */}
            <button
              onClick={() => {
                setCurrentIndex(0);
                setIsPlaying(false);
              }}
              disabled={locations.length === 0}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-500 flex items-center justify-center border border-slate-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Speed Selector Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            {[1, 2, 5, 10].map(spd => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  playbackSpeed === spd 
                    ? 'bg-white text-blue-600 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
