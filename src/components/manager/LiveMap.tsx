import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  MapPin, 
  Layers, 
  Navigation, 
  Camera, 
  Clock, 
  ShieldAlert, 
  CheckCircle,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  Maximize2
} from 'lucide-react';
import { User, LocationRecord, WorkSession, Geofence, FieldVisit, AdminSettings } from '../../types';
import { ApiService } from '../../services/api';
import { createConfiguredTileLayer, configureMapWatermarks } from '../../utils/mapTiles';

interface LiveMapProps {
  executives: (User & {
    latestLocation?: LocationRecord;
    activeSession?: WorkSession;
    todayVisitsCount?: number;
  })[];
  geofences: Geofence[];
  visits: FieldVisit[];
  onSelectExecutive: (executiveId: string) => void;
  onOpenPlayback: (executiveId: string) => void;
  onViewPhoto: (photoUrl: string) => void;
  is16to9Mode?: boolean;
  onToggle16to9?: () => void;
}

export const LiveMap: React.FC<LiveMapProps> = ({
  executives,
  geofences,
  visits,
  onSelectExecutive,
  onOpenPlayback,
  onViewPhoto,
  is16to9Mode = false,
  onToggle16to9,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const geofencesLayerRef = useRef<L.LayerGroup | null>(null);

  const [filterStatus, setFilterStatus] = useState<'ALL' | 'CHECKED_IN' | 'ACTIVE' | 'OFFLINE'>('ALL');
  const [showGeofences, setShowGeofences] = useState(true);
  const [showAccuracyRings, setShowAccuracyRings] = useState(true);
  const [showStaffPhotos, setShowStaffPhotos] = useState(true);
  const [selectedExecId, setSelectedExecId] = useState<string | null>(null);
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Load Admin Map Settings
  useEffect(() => {
    ApiService.getSettings()
      .then((st) => setAdminSettings(st))
      .catch((e) => console.warn('Failed to load map settings in LiveMap:', e));
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [37.7749, -122.4194],
        zoom: 13,
        zoomControl: true,
      });

      // Disable prefix attribution watermark if requested
      if (map.attributionControl) {
        map.attributionControl.setPrefix(false);
      }
      configureMapWatermarks(map, adminSettings);

      const initialTile = createConfiguredTileLayer(adminSettings);
      initialTile.addTo(map);
      tileLayerRef.current = initialTile;

      markersLayerRef.current = L.layerGroup().addTo(map);
      geofencesLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      // Don't destroy on every render to keep pan/zoom smooth
    };
  }, []);

  // Update Tile Layer when AdminSettings change (e.g. Mapbox token entered or changed)
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

  // Update Markers & Geofences
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const geofencesLayer = geofencesLayerRef.current;
    if (!map || !markersLayer || !geofencesLayer) return;

    markersLayer.clearLayers();
    geofencesLayer.clearLayers();

    // 1. Render Geofences
    if (showGeofences) {
      geofences.forEach((geo) => {
        const circle = L.circle([geo.latitude, geo.longitude], {
          color: geo.color || '#3b82f6',
          fillColor: geo.color || '#3b82f6',
          fillOpacity: 0.12,
          weight: 2,
          dashArray: '6, 6',
          radius: geo.radiusMeters,
        });

        circle.bindTooltip(`<b>${geo.name}</b><br/>Radius: ${geo.radiusMeters}m`, {
          permanent: false,
          direction: 'top',
        });

        geofencesLayer.addLayer(circle);
      });
    }

    // 2. Filter Executives
    const safeExecutives = Array.isArray(executives) ? executives : [];
    const safeVisits = Array.isArray(visits) ? visits : [];
    let filtered = safeExecutives;
    if (filterStatus === 'CHECKED_IN') {
      filtered = safeExecutives.filter(e => e && e.currentStatus === 'CHECKED_IN');
    } else if (filterStatus === 'OFFLINE') {
      filtered = safeExecutives.filter(e => e && e.currentStatus === 'OFFLINE');
    }

    const bounds = L.latLngBounds([]);

    // 3. Render Executive Markers
    filtered.forEach((exec) => {
      if (!exec) return;
      const loc = exec.latestLocation;
      if (!loc) return;

      const latLng: [number, number] = [loc.latitude, loc.longitude];
      bounds.extend(latLng);

      // Accuracy ring
      if (showAccuracyRings && loc.accuracy) {
        const accuracyCircle = L.circle(latLng, {
          radius: loc.accuracy,
          color: '#06b6d4',
          fillColor: '#06b6d4',
          fillOpacity: 0.15,
          weight: 1,
        });
        markersLayer.addLayer(accuracyCircle);
      }

      // Find latest visit photo if any
      const execVisits = safeVisits.filter(v => v && v.userId === exec.id);
      const latestVisit = execVisits[0];

      // Custom HTML Marker Pin
      const statusColor = 
        exec.dutyGpsStatus === 'GPS_DISABLED_ABSENT' ? '#ef4444' :
        exec.currentStatus === 'CHECKED_IN' ? '#10b981' :
        exec.currentStatus === 'IDLE' ? '#f59e0b' : '#64748b';

      const innerContent = (showStaffPhotos && exec.avatarUrl) ? `
        <div style="
          width: 38px;
          height: 38px;
          border-radius: 12px;
          overflow: hidden;
          background: #0f172a;
          border: 2.5px solid ${statusColor};
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          cursor: pointer;
        ">
          <img src="${exec.avatarUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
        </div>
      ` : `
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 12px;
          background: #0f172a;
          border: 2px solid ${statusColor};
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 11px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          cursor: pointer;
        ">
          ${exec.employeeId.slice(0, 4)}
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 46px;
            height: 46px;
          ">
            <div style="
              position: absolute;
              width: 46px;
              height: 46px;
              border-radius: 50%;
              background: ${statusColor};
              opacity: 0.25;
              animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            ${innerContent}
            <div style="
              position: absolute;
              bottom: -2px;
              right: -2px;
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background: ${statusColor};
              border: 2px solid #0f172a;
            "></div>
          </div>
        `,
        iconSize: [46, 46],
        iconAnchor: [23, 23],
      });

      const marker = L.marker(latLng, { icon: customIcon });

      // Rich interactive popup
      const popupContent = `
        <div style="font-family: system-ui, sans-serif; min-width: 220px; color: #0f172a;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <strong style="font-size: 14px; color: #0f172a;">${exec.name}</strong>
            <span style="font-size: 10px; font-weight: 700; background: #e2e8f0; padding: 2px 6px; border-radius: 6px;">${exec.employeeId}</span>
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
            Status: <strong style="color: ${statusColor}">${exec.currentStatus || 'ACTIVE'}</strong> &bull; Updates: <strong>${execVisits.length} Visits</strong>
          </div>
          <div style="font-size: 11px; font-family: monospace; background: #f1f5f9; padding: 4px 6px; border-radius: 6px; margin-bottom: 8px;">
            ${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)} (&plusmn;${Math.round(loc.accuracy)}m)
          </div>
          ${latestVisit?.photoUrl ? `
            <div style="margin-bottom: 8px; border-radius: 8px; overflow: hidden; height: 90px; background: #000;">
              <img src="${latestVisit.photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
          ` : ''}
          <div style="display: flex; gap: 4px;">
            <button id="btn-details-${exec.id}" style="
              flex: 1;
              padding: 6px 8px;
              background: #0284c7;
              color: #ffffff;
              font-size: 11px;
              font-weight: 700;
              border: none;
              border-radius: 6px;
              cursor: pointer;
            ">View Timeline</button>
            <button id="btn-playback-${exec.id}" style="
              flex: 1;
              padding: 6px 8px;
              background: #0f172a;
              color: #ffffff;
              font-size: 11px;
              font-weight: 700;
              border: none;
              border-radius: 6px;
              cursor: pointer;
            ">Route Replay</button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('popupopen', () => {
        const btnDetails = document.getElementById(`btn-details-${exec.id}`);
        const btnPlayback = document.getElementById(`btn-playback-${exec.id}`);
        if (btnDetails) {
          btnDetails.onclick = () => onSelectExecutive(exec.id);
        }
        if (btnPlayback) {
          btnPlayback.onclick = () => onOpenPlayback(exec.id);
        }
      });

      markersLayer.addLayer(marker);
    });

    // Auto fit map bounds if valid
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [executives, geofences, visits, filterStatus, showGeofences, showAccuracyRings, showStaffPhotos]);

  // Recalculate leaflet map sizing on 16:9 layout change or window resize
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    resizeObserver.observe(mapContainerRef.current);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [is16to9Mode]);

  return (
    <div className={`relative w-full rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 flex flex-col transition-all duration-300 ${
      is16to9Mode ? 'h-[74vh] min-h-[580px] max-h-[860px]' : 'h-[620px]'
    }`}>
      {/* Map Control Bar Overlay */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Filter Pills */}
        <div className="glass-card flex items-center gap-1 p-1 rounded-xl shadow-md pointer-events-auto text-xs font-bold">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filterStatus === 'ALL' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            All Executives ({executives.length})
          </button>
          <button
            onClick={() => setFilterStatus('CHECKED_IN')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filterStatus === 'CHECKED_IN' ? 'bg-green-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            Checked In ({(Array.isArray(executives) ? executives : []).filter(e => e && e.currentStatus === 'CHECKED_IN').length})
          </button>
          <button
            onClick={() => setFilterStatus('OFFLINE')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filterStatus === 'OFFLINE' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            Offline
          </button>
        </div>

        {/* Layer Toggles & Photo Visibility */}
        <div className="glass-card flex items-center gap-1.5 p-1 rounded-xl shadow-md pointer-events-auto text-xs font-semibold text-slate-700">
          <button
            onClick={() => setShowStaffPhotos(!showStaffPhotos)}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              showStaffPhotos ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
            title="Toggle Staff Photographs on Map Markers"
          >
            <Camera className="w-3.5 h-3.5 text-indigo-600" />
            <span>Staff Photos: {showStaffPhotos ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowGeofences(!showGeofences)}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              showGeofences ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Geofences</span>
          </button>

          <button
            onClick={() => setShowAccuracyRings(!showAccuracyRings)}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              showAccuracyRings ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 text-cyan-600" />
            <span>Rings</span>
          </button>

          {onToggle16to9 && (
            <button
              onClick={onToggle16to9}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                is16to9Mode ? 'bg-amber-50 text-amber-700 border border-amber-300 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
              title="Toggle 16:9 Cinema Projection Layout for Large Display Screens"
            >
              <Maximize2 className="w-3.5 h-3.5 text-amber-600" />
              <span>16:9 View</span>
            </button>
          )}
        </div>
      </div>

      {/* Map Element Container */}
      <div ref={mapContainerRef} className="w-full h-full z-10 clean-map-tiles" />

      {/* Bottom Live Legend & Count */}
      <div className="glass-card absolute bottom-3 left-3 z-20 px-3.5 py-2 rounded-xl shadow-md flex items-center gap-3 text-xs text-slate-700">
        <div className="flex items-center gap-1.5 font-bold">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 status-pulse" />
          <span>Active Telemetry Feed</span>
        </div>
        <span className="text-slate-300">&bull;</span>
        <span className="font-mono text-blue-600 font-bold">{executives.length} Field Units</span>
      </div>
    </div>
  );
};
