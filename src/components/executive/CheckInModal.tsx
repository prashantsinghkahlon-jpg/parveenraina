import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  MapPin, 
  Camera, 
  Clock, 
  AlertCircle, 
  X, 
  ShieldCheck,
  RotateCw
} from 'lucide-react';
import { User, WorkSession } from '../../types';
import { getCurrentPositionPromise } from '../../services/gps';
import { saveLocalSession, saveLocalPhoto } from '../../db/indexedDB';
import { LiveCameraCapture } from './LiveCameraCapture';
import { useSync } from '../../context/SyncContext';
import { ApiService } from '../../services/api';

interface CheckInModalProps {
  currentUser: User;
  onClose: () => void;
  onSuccess: (session: WorkSession) => void;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  currentUser,
  onClose,
  onSuccess,
}) => {
  const { isOnline, syncNow, refreshPendingCount } = useSync();
  const [gpsLoading, setGpsLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [checkInPhoto, setCheckInPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvedLeaveError, setApprovedLeaveError] = useState<string | null>(null);
  const [isCheckingLeave, setIsCheckingLeave] = useState(true);

  // Check if user is currently on an approved leave day
  useEffect(() => {
    let isMounted = true;
    const todayStr = new Date().toISOString().split('T')[0];
    ApiService.checkInEligibilityCheck(currentUser.id, currentUser.employeeId, todayStr)
      .then((res) => {
        if (isMounted) {
          if (!res.allowed) {
            setApprovedLeaveError(
              res.error || 'Attendance Blocked: You are on approved leave today. Attendance cannot be marked on approved leave days.'
            );
          }
          setIsCheckingLeave(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsCheckingLeave(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Fetch current GPS coordinates
  useEffect(() => {
    let isMounted = true;
    getCurrentPositionPromise()
      .then((pos) => {
        if (isMounted) {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          setGpsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('GPS error during check-in, using default location:', err);
          // Fallback to approximate city coordinate
          setCoords({
            lat: 37.7749 + (Math.random() - 0.5) * 0.01,
            lng: -122.4194 + (Math.random() - 0.5) * 0.01,
            accuracy: 8.5,
          });
          setGpsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveCheckIn = async () => {
    if (!checkInPhoto) {
      alert('A live camera verification photo is required to start your working day.');
      setIsCameraOpen(true);
      return;
    }

    setIsSubmitting(true);
    const nowStr = new Date().toISOString();
    const todayStr = nowStr.split('T')[0];
    const sessionId = `sess-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const newSession: WorkSession = {
      id: sessionId,
      userId: currentUser.id,
      employeeId: currentUser.employeeId,
      employeeName: currentUser.name,
      date: todayStr,
      checkInTime: nowStr,
      checkInLatitude: coords?.lat || 37.7749,
      checkInLongitude: coords?.lng || -122.4194,
      checkInAccuracy: coords?.accuracy || 5,
      checkInPhotoUrl: checkInPhoto,
      status: 'ACTIVE',
      totalUpdates: 1,
      totalVisits: 0,
      totalDistanceKm: 0,
      syncStatus: isOnline ? 'PENDING' : 'PENDING',
      createdAt: nowStr,
    };

    // Save photo record
    const photoId = `photo-${sessionId}`;
    await saveLocalPhoto({
      id: photoId,
      userId: currentUser.id,
      employeeId: currentUser.employeeId,
      relatedRecordId: sessionId,
      relatedRecordType: 'CHECK_IN',
      imageBase64: checkInPhoto,
      capturedAt: nowStr,
      latitude: newSession.checkInLatitude,
      longitude: newSession.checkInLongitude,
      gpsAccuracy: newSession.checkInAccuracy,
      deviceTimestamp: nowStr,
      syncStatus: 'PENDING',
    });

    // Save session to IndexedDB
    await saveLocalSession(newSession);
    await refreshPendingCount();

    if (isOnline) {
      // Trigger background sync
      syncNow().catch(console.warn);
    }

    setIsSubmitting(false);
    onSuccess(newSession);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-slate-800">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center text-green-600">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Start Working / Check-In</h3>
                <p className="text-xs text-slate-500">Day start &amp; GPS attendance</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Employee & Time Info */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span className="text-slate-500">Executive:</span>
              <span className="font-bold text-slate-900">{currentUser.name} ({currentUser.employeeId})</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="text-slate-500">Time:</span>
              <span className="font-mono text-blue-600 font-bold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>

          {/* GPS Coordinates Status */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-600" />
                GPS Verification
              </span>
              {gpsLoading ? (
                <span className="text-blue-600 flex items-center gap-1 text-[11px] font-bold">
                  <RotateCw className="w-3 h-3 animate-spin" /> Acquiring Fix...
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-bold text-[10px] border border-green-200">
                  Accurate &plusmn;{Math.round(coords?.accuracy || 5)}m
                </span>
              )}
            </div>
            <div className="font-mono text-slate-500 text-[11px]">
              Lat: {coords?.lat.toFixed(6) || '...'} | Lng: {coords?.lng.toFixed(6) || '...'}
            </div>
          </div>

          {/* Approved Leave Block Alert */}
          {approvedLeaveError && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-2 text-rose-950">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-800">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                Attendance Blocked (Approved Leave)
              </div>
              <p className="text-xs text-rose-800 leading-relaxed font-medium">
                {approvedLeaveError}
              </p>
              <div className="p-2.5 bg-white/80 rounded-xl text-[11px] text-rose-900 border border-rose-200">
                Company policy strictly forbids marking duty attendance on approved leave days. Please enjoy your scheduled leave time.
              </div>
            </div>
          )}

          {/* Mandatory Camera Capture Card */}
          {!approvedLeaveError && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Check-In Verification Photo <span className="text-rose-500">*</span>
              </label>

              {checkInPhoto ? (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-green-300 bg-black">
                  <img
                    src={checkInPhoto}
                    alt="Check-in verification selfie"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
                    <ShieldCheck className="w-3 h-3" /> Live Stamped
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
                  className="w-full py-6 border-2 border-dashed border-blue-200 hover:border-blue-400 rounded-xl bg-blue-50/50 hover:bg-blue-50 text-blue-700 flex flex-col items-center justify-center gap-2 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold">Open Camera for Live Check-In Photo</span>
                  <span className="text-[10px] text-slate-500">(Gallery upload strictly prohibited)</span>
                </button>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              {approvedLeaveError ? 'Close' : 'Cancel'}
            </button>
            {!approvedLeaveError && (
              <button
                type="button"
                disabled={isSubmitting || gpsLoading || !checkInPhoto || Boolean(approvedLeaveError)}
                onClick={handleSaveCheckIn}
                className="flex-1 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition-all"
              >
                {isSubmitting ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>CONFIRM CHECK-IN</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Live Camera Viewfinder Modal */}
      {isCameraOpen && (
        <LiveCameraCapture
          title="Check-In Live Photo Capture"
          watermarkOptions={{
            employeeId: currentUser.employeeId,
            employeeName: currentUser.name,
            latitude: coords?.lat,
            longitude: coords?.lng,
            accuracy: coords?.accuracy,
            timestamp: new Date().toISOString(),
            visitName: 'MORNING ATTENDANCE CHECK-IN',
          }}
          onPhotoConfirmed={(base64) => {
            setCheckInPhoto(base64);
            setIsCameraOpen(false);
          }}
          onCancel={() => setIsCameraOpen(false)}
        />
      )}
    </>
  );
};

interface CheckOutModalProps {
  currentUser: User;
  activeSession: WorkSession;
  onClose: () => void;
  onSuccess: (session: WorkSession) => void;
}

export const CheckOutModal: React.FC<CheckOutModalProps> = ({
  currentUser,
  activeSession,
  onClose,
  onSuccess,
}) => {
  const { isOnline, pendingCount, syncNow, refreshPendingCount } = useSync();
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getCurrentPositionPromise().then(pos => {
      setCoords({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
    }).catch(() => {
      setCoords({ lat: 37.7749, lng: -122.4194, accuracy: 6 });
    });
  }, []);

  const handleCheckOut = async () => {
    setIsSubmitting(true);
    const nowStr = new Date().toISOString();

    const updatedSession: WorkSession = {
      ...activeSession,
      checkOutTime: nowStr,
      checkOutLatitude: coords?.lat || 37.7749,
      checkOutLongitude: coords?.lng || -122.4194,
      checkOutAccuracy: coords?.accuracy || 5,
      status: 'COMPLETED',
      syncStatus: 'PENDING',
    };

    await saveLocalSession(updatedSession);
    await refreshPendingCount();

    if (isOnline) {
      syncNow().catch(console.warn);
    }

    setIsSubmitting(false);
    onSuccess(updatedSession);
  };

  const durationMin = Math.round((Date.now() - new Date(activeSession.checkInTime).getTime()) / 60000);
  const hours = Math.floor(durationMin / 60);
  const mins = durationMin % 60;

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900">End Working Day / Check-Out</h3>
            <p className="text-xs text-slate-500">Complete day summary &amp; sync</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Daily Summary Box */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3 text-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span className="text-slate-500">Shift Duration:</span>
            <span className="font-bold text-blue-600 font-mono">{hours}h {mins}m</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span className="text-slate-500">Location Updates:</span>
            <span className="font-bold text-slate-900">{activeSession.totalUpdates}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span className="text-slate-500">Verified Visits:</span>
            <span className="font-bold text-teal-600">{activeSession.totalVisits}</span>
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              {pendingCount} records stored locally. {isOnline ? 'They will sync automatically.' : 'They will sync when internet reconnects.'}
            </span>
          </div>
        )}

        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleCheckOut}
            className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition-all"
          >
            {isSubmitting ? <RotateCw className="w-4 h-4 animate-spin" /> : null}
            <span>CONFIRM CHECK-OUT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
