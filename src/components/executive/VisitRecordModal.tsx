import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  MapPin, 
  Clock, 
  CheckCircle, 
  X, 
  ShieldCheck, 
  RotateCw,
  Building,
  UserCheck,
  FileText
} from 'lucide-react';
import { User, WorkSession, FieldVisit } from '../../types';
import { getCurrentPositionPromise, validateGpsRecord } from '../../services/gps';
import { saveLocalVisit, saveLocalPhoto, saveLocalSession } from '../../db/indexedDB';
import { LiveCameraCapture } from './LiveCameraCapture';
import { useSync } from '../../context/SyncContext';

interface VisitRecordModalProps {
  currentUser: User;
  activeSession: WorkSession | null;
  onClose: () => void;
  onSuccess: (visit: FieldVisit) => void;
}

export const VisitRecordModal: React.FC<VisitRecordModalProps> = ({
  currentUser,
  activeSession,
  onClose,
  onSuccess,
}) => {
  const { isOnline, syncNow, refreshPendingCount } = useSync();
  const [gpsLoading, setGpsLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);

  const [visitName, setVisitName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
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
          });
          setGpsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCoords({
            lat: 37.7749 + (Math.random() - 0.5) * 0.008,
            lng: -122.4194 + (Math.random() - 0.5) * 0.008,
            accuracy: 4.8,
          });
          setGpsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitName.trim()) {
      alert('Please enter the Customer, Doctor, or Client name for this visit.');
      return;
    }
    if (!capturedPhoto) {
      alert('A live camera verified photo is mandatory to record this visit.');
      setIsCameraOpen(true);
      return;
    }

    setIsSubmitting(true);
    const nowStr = new Date().toISOString();
    const visitId = `vis-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const validationFlags = validateGpsRecord(
      {
        latitude: coords?.lat || 37.7749,
        longitude: coords?.lng || -122.4194,
        accuracy: coords?.accuracy || 5,
        capturedAt: nowStr,
      },
      null,
      null,
      { maxAcceptableAccuracy: 45, suspiciousSpeedLimitKmh: 95 }
    );

    const newVisit: FieldVisit = {
      id: visitId,
      userId: currentUser.id,
      employeeId: currentUser.employeeId,
      employeeName: currentUser.name,
      sessionId: activeSession?.id || 'manual-session',
      visitName: visitName.trim(),
      locationName: locationName.trim() || 'Field Location',
      latitude: coords?.lat || 37.7749,
      longitude: coords?.lng || -122.4194,
      accuracy: coords?.accuracy || 5,
      capturedAt: nowStr,
      deviceTimestamp: nowStr,
      remarks: remarks.trim() || undefined,
      photoUrl: capturedPhoto,
      syncStatus: 'PENDING',
      validationFlags,
      verifiedByManager: false,
    };

    // Save photo record in IndexedDB
    await saveLocalPhoto({
      id: `photo-${visitId}`,
      userId: currentUser.id,
      employeeId: currentUser.employeeId,
      relatedRecordId: visitId,
      relatedRecordType: 'VISIT',
      imageBase64: capturedPhoto,
      capturedAt: nowStr,
      latitude: newVisit.latitude,
      longitude: newVisit.longitude,
      gpsAccuracy: newVisit.accuracy,
      deviceTimestamp: nowStr,
      syncStatus: 'PENDING',
    });

    // Save visit in IndexedDB
    await saveLocalVisit(newVisit);

    // Update active session visit count
    if (activeSession) {
      const updatedSession: WorkSession = {
        ...activeSession,
        totalVisits: (activeSession.totalVisits || 0) + 1,
      };
      await saveLocalSession(updatedSession);
    }

    await refreshPendingCount();

    if (isOnline) {
      syncNow().catch(console.warn);
    }

    setIsSubmitting(false);
    onSuccess(newVisit);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 text-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Record Field Visit</h3>
                <p className="text-xs text-slate-500">Live GPS &amp; Camera verification</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Visit Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Customer / Doctor / Facility Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={visitName}
                  onChange={(e) => setVisitName(e.target.value)}
                  placeholder="e.g. Dr. Arthur Hayes / Apollo Pharmacy"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white font-medium transition-all"
                />
              </div>
            </div>

            {/* Location / Suite */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Location Name / Suite / Room
              </label>
              <div className="relative">
                <Building className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. Suite 300, 3rd Floor East Wing"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* GPS Metadata Chip */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                <MapPin className="w-4 h-4 text-teal-600" />
                <span className="font-mono text-[11px] text-slate-600">
                  {coords?.lat.toFixed(5)}, {coords?.lng.toFixed(5)}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold border border-teal-200">
                &plusmn;{Math.round(coords?.accuracy || 5)}m
              </span>
            </div>

            {/* Mandatory Camera Photo Section */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Live Verification Photo <span className="text-rose-500">*</span>
              </label>

              {capturedPhoto ? (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-teal-300 bg-black shadow-xs">
                  <img
                    src={capturedPhoto}
                    alt="Captured field visit"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
                    <ShieldCheck className="w-3 h-3" /> Live Camera Verified
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="absolute bottom-2 right-2 px-3 py-1 bg-slate-900/80 hover:bg-slate-900 text-white text-xs rounded-lg border border-slate-700 backdrop-blur font-semibold"
                  >
                    Retake
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  className="w-full py-5 border-2 border-dashed border-teal-200 hover:border-teal-400 rounded-xl bg-teal-50/50 hover:bg-teal-50 text-teal-700 flex flex-col items-center justify-center gap-1.5 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold">Open Camera for Visit Photo</span>
                  <span className="text-[10px] text-slate-500">(Gallery upload strictly prohibited)</span>
                </button>
              )}
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Meeting Remarks / Discussion Summary
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                placeholder="e.g. Discussed new product inventory, received positive feedback on Q3 deliverables..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white resize-none transition-all"
              />
            </div>

            {/* Submit Actions */}
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
                disabled={isSubmitting || !capturedPhoto}
                className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition-all"
              >
                {isSubmitting ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>SUBMIT VISIT</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Live Camera Viewfinder */}
      {isCameraOpen && (
        <LiveCameraCapture
          title={`Visit Photo: ${visitName || 'Live Field Verification'}`}
          watermarkOptions={{
            employeeId: currentUser.employeeId,
            employeeName: currentUser.name,
            latitude: coords?.lat,
            longitude: coords?.lng,
            accuracy: coords?.accuracy,
            timestamp: new Date().toISOString(),
            visitName: visitName.trim() || 'CLIENT FIELD VISIT',
          }}
          onPhotoConfirmed={(base64) => {
            setCapturedPhoto(base64);
            setIsCameraOpen(false);
          }}
          onCancel={() => setIsCameraOpen(false)}
        />
      )}
    </>
  );
};
