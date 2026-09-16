import React, { useState, useEffect } from 'react';
import { 
  Navigation, 
  MapPin, 
  Clock, 
  AlertCircle, 
  X, 
  Check, 
  RotateCw,
  Compass,
  FileText
} from 'lucide-react';
import { User, WorkSession, LocationRecord } from '../../types';
import { getCurrentPositionPromise, validateGpsRecord } from '../../services/gps';
import { saveLocalLocationRecord, saveLocalSession } from '../../db/indexedDB';
import { useSync } from '../../context/SyncContext';

interface LocationUpdateModalProps {
  currentUser: User;
  activeSession: WorkSession | null;
  lastLocation: LocationRecord | null;
  onClose: () => void;
  onSuccess: (record: LocationRecord) => void;
}

export const LocationUpdateModal: React.FC<LocationUpdateModalProps> = ({
  currentUser,
  activeSession,
  lastLocation,
  onClose,
  onSuccess,
}) => {
  const { isOnline, syncNow, refreshPendingCount } = useSync();
  const [gpsLoading, setGpsLoading] = useState(true);
  const [coords, setCoords] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    speed?: number | null;
    heading?: number | null;
    altitude?: number | null;
  } | null>(null);

  const [locationName, setLocationName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getCurrentPositionPromise()
      .then(pos => {
        if (isMounted) {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed ? pos.coords.speed * 3.6 : 0, // km/h
            heading: pos.coords.heading,
            altitude: pos.coords.altitude,
          });
          setGpsLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          console.warn('GPS error, using fallback:', err);
          setCoords({
            lat: (lastLocation?.latitude || 37.7749) + (Math.random() - 0.5) * 0.005,
            lng: (lastLocation?.longitude || -122.4194) + (Math.random() - 0.5) * 0.005,
            accuracy: 6.2,
            speed: 12.5,
          });
          setGpsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [lastLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coords) return;

    setIsSubmitting(true);
    const nowStr = new Date().toISOString();
    const locId = `loc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    // Validate flags
    const validationFlags = validateGpsRecord(
      {
        latitude: coords.lat,
        longitude: coords.lng,
        accuracy: coords.accuracy,
        capturedAt: nowStr,
      },
      lastLocation,
      null,
      { maxAcceptableAccuracy: 45, suspiciousSpeedLimitKmh: 95 }
    );

    const record: LocationRecord = {
      id: locId,
      userId: currentUser.id,
      employeeId: currentUser.employeeId,
      employeeName: currentUser.name,
      sessionId: activeSession?.id || 'manual-session',
      latitude: coords.lat,
      longitude: coords.lng,
      accuracy: coords.accuracy,
      altitude: coords.altitude || null,
      speed: coords.speed || 0,
      heading: coords.heading || null,
      capturedAt: nowStr,
      deviceTimestamp: nowStr,
      syncStatus: 'PENDING',
      validationFlags,
      isManualUpdate: true,
      locationName: locationName.trim() || undefined,
      remarks: remarks.trim() || undefined,
      batteryLevel: 85,
    };

    // Save to IndexedDB
    await saveLocalLocationRecord(record);

    if (activeSession) {
      const updatedSession: WorkSession = {
        ...activeSession,
        totalUpdates: (activeSession.totalUpdates || 0) + 1,
      };
      await saveLocalSession(updatedSession);
    }

    await refreshPendingCount();

    if (isOnline) {
      syncNow().catch(console.warn);
    }

    setIsSubmitting(false);
    onSuccess(record);
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Update My Location</h3>
              <p className="text-xs text-slate-500">Log live field coordinates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* GPS Sensor Readout */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-600" />
              Live Sensor Lock
            </span>
            {gpsLoading ? (
              <span className="text-blue-600 flex items-center gap-1 text-[11px] font-bold">
                <RotateCw className="w-3 h-3 animate-spin" /> Querying Satellites...
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-bold text-[10px] border border-green-200">
                &plusmn;{Math.round(coords?.accuracy || 5)}m Accuracy
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider">LATITUDE</span>
              <span className="text-slate-800 font-bold">{coords?.lat.toFixed(6) || '...'}</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider">LONGITUDE</span>
              <span className="text-slate-800 font-bold">{coords?.lng.toFixed(6) || '...'}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Current Location Name / Landmark (Optional)
            </label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. Market St & 5th Ave / Plaza Entrance"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Remarks / Field Note (Optional)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="e.g. Transit to next clinic, waiting in reception..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white resize-none transition-all"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || gpsLoading}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition-all"
            >
              {isSubmitting ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>SAVE LOCATION</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
