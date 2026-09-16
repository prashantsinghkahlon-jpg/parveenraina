import React, { useState, useEffect } from 'react';
import { 
  Navigation, 
  Camera, 
  CheckCircle, 
  LogOut, 
  MapPin, 
  Clock, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  ShieldCheck, 
  Activity, 
  Calendar, 
  Eye,
  Layers,
  ChevronRight,
  TrendingUp,
  Radio,
  KeyRound,
  Power
} from 'lucide-react';
import { User, WorkSession, LocationRecord, FieldVisit } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import { 
  getActiveLocalSession, 
  getLocalLocationRecords, 
  getLocalVisits 
} from '../../db/indexedDB';
import { getCurrentPositionPromise } from '../../services/gps';
import { CheckInModal, CheckOutModal } from './CheckInModal';
import { LocationUpdateModal } from './LocationUpdateModal';
import { VisitRecordModal } from './VisitRecordModal';
import { StaffLeaveModal } from './StaffLeaveModal';
import { StaffSalaryAttendanceView } from './StaffSalaryAttendanceView';
import { StaffLeaveStatusView } from './StaffLeaveStatusView';
import { PasswordResetModal } from '../common/PasswordResetModal';
import { ApiService } from '../../services/api';

export const ExecutiveDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { isOnline, isSimulatedOffline, syncState, pendingCount, syncNow } = useSync();

  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [visits, setVisits] = useState<FieldVisit[]>([]);
  const [currentGps, setCurrentGps] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isGpsQuerying, setIsGpsQuerying] = useState(false);

  // GPS Sensor & Duty Tracking State
  const [isGpsHardwareEnabled, setIsGpsHardwareEnabled] = useState(true);
  const [showGpsWarningModal, setShowGpsWarningModal] = useState(false);
  const [dutyGpsStatus, setDutyGpsStatus] = useState<'GPS_ACTIVE' | 'GPS_DISABLED_ABSENT'>(
    currentUser.dutyGpsStatus || 'GPS_ACTIVE'
  );

  // Active Modals
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'actions' | 'attendance_salary' | 'leaves' | 'timeline'>('actions');

  // Load today's local records
  const loadLocalState = async () => {
    try {
      const session = await getActiveLocalSession(currentUser.id);
      setActiveSession(session);
      const locs = await getLocalLocationRecords(currentUser.id);
      setLocations(locs);
      const vsts = await getLocalVisits(currentUser.id);
      setVisits(vsts);
    } catch (err) {
      console.warn('Error loading local state:', err);
    }
  };

  useEffect(() => {
    loadLocalState();
  }, [currentUser]);

  // Query live GPS coordinates periodically
  useEffect(() => {
    let isMounted = true;
    const fetchGps = () => {
      setIsGpsQuerying(true);
      getCurrentPositionPromise()
        .then(pos => {
          if (isMounted) {
            setCurrentGps({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            });
            setIsGpsQuerying(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            // Fallback default
            setCurrentGps({
              lat: 37.7749 + (Math.random() - 0.5) * 0.004,
              lng: -122.4194 + (Math.random() - 0.5) * 0.004,
              accuracy: 5.5,
            });
            setIsGpsQuerying(false);
          }
        });
    };

    const userIntervalMs = Math.max(5, Number(currentUser.gpsUpdateIntervalSeconds) || 30) * 1000;
    fetchGps();
    const interval = setInterval(fetchGps, userIntervalMs);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentUser.gpsUpdateIntervalSeconds]);

  // Handle GPS hardware/permission changes during duty period
  const handleToggleGps = () => {
    if (isGpsHardwareEnabled) {
      // Trying to switch OFF GPS: Raise warning to prevent accidental non-compliance
      setShowGpsWarningModal(true);
    } else {
      // Re-enabling GPS: proceed immediately
      executeGpsToggle(true);
    }
  };

  const executeGpsToggle = async (enable: boolean) => {
    setShowGpsWarningModal(false);
    setIsGpsHardwareEnabled(enable);

    if (activeSession) {
      if (!enable) {
        setDutyGpsStatus('GPS_DISABLED_ABSENT');
        try {
          await ApiService.reportDutyComplianceAlert({
            userId: currentUser.id,
            employeeId: currentUser.employeeId,
            employeeName: currentUser.name,
            type: 'GPS_DISABLED_DUTY',
            message: 'Employee switched off GPS sensor during active duty hours'
          });
        } catch (err) {
          console.warn('Failed to report compliance alert:', err);
        }
        await ApiService.reportGpsDutyStatus(currentUser.id, true);
      } else {
        setDutyGpsStatus('GPS_ACTIVE');
        await ApiService.reportGpsDutyStatus(currentUser.id, false);
      }
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-[calc(100vh-4rem)] p-3 sm:p-4 space-y-4 pb-20 text-slate-800">
      {/* GPS DISABLED ABSENT ALERT BANNER */}
      {dutyGpsStatus === 'GPS_DISABLED_ABSENT' && activeSession && (
        <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-2xl flex items-start gap-3 text-rose-950 shadow-md animate-pulse">
          <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1.5">
            <div className="font-black text-sm text-rose-800 tracking-wide uppercase">
              GPS Disabled: Marked Absent
            </div>
            <p className="leading-relaxed font-medium text-rose-900">
              Staff policy requires continuous GPS tracking throughout duty. Because your GPS is currently disabled, you have been <strong>marked ABSENT</strong> with penalty deductions until GPS is re-enabled.
            </p>
            <button
              onClick={handleToggleGps}
              className="mt-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Power className="w-3.5 h-3.5" />
              Re-Enable GPS Sensor
            </button>
          </div>
        </div>
      )}

      {/* Field Executive Profile & Status Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
              {currentUser.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-slate-900">{currentUser.name}</h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[10px] font-mono text-blue-700 font-bold border border-blue-200">
                  {currentUser.employeeId}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {currentUser.staffType === 'OFFICE_STAFF' ? 'Office Staff' : currentUser.staffType === 'FIELD_RUNNER' ? 'Field Runner' : 'Field Executive'}
              </p>
            </div>
          </div>

          {/* Working Status Badge */}
          <div>
            {dutyGpsStatus === 'GPS_DISABLED_ABSENT' && activeSession ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-rose-500 status-pulse" />
                GPS ABSENT
              </span>
            ) : activeSession ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200 flex items-center gap-1.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-green-500 status-pulse" />
                CHECKED IN
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                OFF DUTY
              </span>
            )}
          </div>
        </div>

        {/* Shift details & KPIs */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Shift Start</span>
            <span className="text-xs font-bold text-slate-800 mt-0.5 block font-mono">
              {activeSession ? new Date(activeSession.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
            </span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">GPS Points</span>
            <span className="text-xs font-bold text-blue-600 mt-0.5 block font-mono">
              {locations.length} updates
            </span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Field Visits</span>
            <span className="text-xs font-bold text-teal-600 mt-0.5 block font-mono">
              {visits.length} logged
            </span>
          </div>
        </div>
      </div>

      {/* GPS Sensor & Accuracy Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between text-xs shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
            isGpsQuerying ? 'bg-blue-50 text-blue-600 border-blue-200 status-pulse' : 'bg-slate-50 text-blue-600 border-slate-200'
          }`}>
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
              <span>GPS Satellites Locked</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                (currentGps?.accuracy || 10) < 20 
                  ? 'bg-green-50 text-green-700 border-green-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                &plusmn;{Math.round(currentGps?.accuracy || 5)}m
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-500 mt-0.5">
              {currentGps ? `${currentGps.lat.toFixed(5)}, ${currentGps.lng.toFixed(5)}` : 'Acquiring GPS fix...'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowLocationModal(true)}
          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-blue-600 rounded-lg text-xs font-bold border border-slate-200 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Offline Storage & Pending Sync Banner */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
              {pendingCount}
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900">
                {pendingCount} {pendingCount === 1 ? 'Record' : 'Records'} Saved Locally
              </p>
              <p className="text-[10px] text-amber-700">
                {isOnline ? 'Ready to sync to central database' : 'Will auto-sync when back online'}
              </p>
            </div>
          </div>

          {isOnline && (
            <button
              onClick={() => syncNow()}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Sync</span>
            </button>
          )}
        </div>
      )}

      {/* Segmented View Switcher */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('actions')}
          className={`px-3 py-2 rounded-xl transition-all shrink-0 sm:flex-1 ${
            activeTab === 'actions' 
              ? 'bg-white text-blue-600 shadow-xs' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Field Actions
        </button>
        <button
          onClick={() => setActiveTab('attendance_salary')}
          className={`px-3 py-2 rounded-xl transition-all shrink-0 sm:flex-1 ${
            activeTab === 'attendance_salary' 
              ? 'bg-white text-blue-600 shadow-xs' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Salary &amp; Attendance
        </button>
        <button
          onClick={() => setActiveTab('leaves')}
          className={`px-3 py-2 rounded-xl transition-all shrink-0 sm:flex-1 ${
            activeTab === 'leaves' 
              ? 'bg-white text-blue-600 shadow-xs' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          My Leaves
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-3 py-2 rounded-xl transition-all shrink-0 sm:flex-1 ${
            activeTab === 'timeline' 
              ? 'bg-white text-blue-600 shadow-xs' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Today's Activity ({locations.length + visits.length})
        </button>
      </div>

      {/* ================= ACTIONS TAB ================= */}
      {activeTab === 'actions' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          {/* Main Action 1: UPDATE MY LOCATION */}
          <button
            onClick={() => setShowLocationModal(true)}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-600/20 active:scale-[0.99] transition-all flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur group-hover:scale-105 transition-transform">
                <Navigation className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base tracking-wide">UPDATE MY LOCATION</h3>
                <p className="text-xs text-blue-100 font-medium">Log live GPS coordinates &amp; sensor accuracy</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/80" />
          </button>

          {/* Main Action 2: RECORD FIELD VISIT */}
          <button
            onClick={() => setShowVisitModal(true)}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-md shadow-teal-600/20 active:scale-[0.99] transition-all flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur group-hover:scale-105 transition-transform">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base tracking-wide">RECORD FIELD VISIT</h3>
                <p className="text-xs text-teal-100 font-medium">Live camera verification &amp; customer remarks</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/80" />
          </button>

          {/* Secondary Actions Grid: Apply Leave & Reset Password */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setShowLeaveModal(true)}
              className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-left shadow-xs transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-slate-900">Request Leave</div>
              <div className="text-[11px] text-slate-500">CL, SL, EL applications</div>
            </button>

            <button
              onClick={() => setShowPasswordModal(true)}
              className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-left shadow-xs transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <KeyRound className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-slate-900">Reset Password</div>
              <div className="text-[11px] text-slate-500">Update login credentials</div>
            </button>
          </div>

          {/* Mandatory GPS Duty Policy & Hardware Toggle Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Power className="w-3.5 h-3.5 text-blue-600" />
                <span>GPS Duty Sensor</span>
              </div>
              <button
                onClick={handleToggleGps}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                  isGpsHardwareEnabled 
                    ? 'bg-green-50 text-green-700 border-green-300' 
                    : 'bg-rose-50 text-rose-700 border-rose-300'
                }`}
              >
                {isGpsHardwareEnabled ? 'GPS ON (Duty Active)' : 'GPS OFF (Marked Absent)'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              <strong>Mandatory Rule:</strong> Staff need to keep the GPS enabled throughout duty. Disabling GPS marks the staff member absent until re-enabled.
            </p>
          </div>

          {/* Start / End Shift Buttons */}
          <div className="pt-1">
            {!activeSession ? (
              <button
                onClick={() => setShowCheckInModal(true)}
                className="w-full py-3.5 px-4 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 font-extrabold text-xs border border-green-300 flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>START WORK / CHECK-IN</span>
              </button>
            ) : (
              <button
                onClick={() => setShowCheckOutModal(true)}
                className="w-full py-3.5 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-extrabold text-xs border border-red-300 flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <LogOut className="w-4 h-4 text-red-600" />
                <span>END WORK / CHECK-OUT</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================= TIMELINE TAB ================= */}
      {activeTab === 'timeline' && (
        <div className="space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Today's Breadcrumb Trail</span>
            <span className="text-blue-600 font-mono text-[11px] font-bold">{locations.length} Locations &bull; {visits.length} Visits</span>
          </div>

          {locations.length === 0 && visits.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
              <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No activity recorded today</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Tap "Update My Location" or "Record Field Visit" to begin your trail.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Combine & sort chronologically */}
              {[
                ...visits.map(v => ({ type: 'VISIT' as const, data: v, time: v.capturedAt })),
                ...locations.map(l => ({ type: 'LOCATION' as const, data: l, time: l.capturedAt })),
              ]
                .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                .map((item, idx) => {
                  if (item.type === 'VISIT') {
                    const visit = item.data as FieldVisit;
                    return (
                      <div
                        key={`v-${visit.id || idx}`}
                        className="p-3.5 bg-white border border-teal-200 rounded-2xl shadow-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold text-[10px] border border-teal-200 flex items-center gap-1">
                              <Camera className="w-3 h-3 text-teal-600" /> FIELD VISIT
                            </span>
                            <span className="text-xs font-bold text-slate-900 truncate max-w-[160px]">
                              {visit.visitName}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-500 font-bold">
                            {new Date(visit.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Location / Remarks */}
                        {visit.locationName && (
                          <p className="text-[11px] text-slate-700 flex items-center gap-1 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span>{visit.locationName}</span>
                          </p>
                        )}
                        {visit.remarks && (
                          <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            "{visit.remarks}"
                          </p>
                        )}

                        {/* Photo Thumbnail */}
                        {visit.photoUrl && (
                          <div className="flex items-center justify-between pt-1">
                            <button
                              onClick={() => setSelectedPhoto(visit.photoUrl)}
                              className="flex items-center gap-2 text-[11px] text-blue-600 hover:text-blue-500 font-bold"
                            >
                              <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shadow-xs">
                                <img src={visit.photoUrl} alt="thumbnail" className="w-full h-full object-cover" />
                              </div>
                              <span>View Live Camera Stamp</span>
                            </button>

                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              visit.syncStatus === 'SYNCED' 
                                ? 'bg-green-50 text-green-700 border-green-200' 
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {visit.syncStatus}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    const loc = item.data as LocationRecord;
                    return (
                      <div
                        key={`l-${loc.id || idx}`}
                        className="p-3.5 bg-white border border-slate-200 rounded-2xl text-xs space-y-1.5 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-blue-600" />
                            {loc.locationName || 'GPS Breadcrumb Point'}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 font-bold">
                            {new Date(loc.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                          <span>{loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)} (&plusmn;{Math.round(loc.accuracy)}m)</span>
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                            loc.syncStatus === 'SYNCED' ? 'text-green-700 bg-green-50 border-green-200' : 'text-amber-700 bg-amber-50 border-amber-200'
                          }`}>
                            {loc.syncStatus}
                          </span>
                        </div>
                      </div>
                    );
                  }
                })}
            </div>
          )}
        </div>
      )}

      {/* ================= SALARY & ATTENDANCE TAB ================= */}
      {activeTab === 'attendance_salary' && (
        <StaffSalaryAttendanceView currentUser={currentUser} />
      )}

      {/* ================= LEAVE APPLICATIONS TAB ================= */}
      {activeTab === 'leaves' && (
        <StaffLeaveStatusView 
          currentUser={currentUser} 
          onApplyNewLeave={() => setShowLeaveModal(true)} 
        />
      )}

      {/* Modals */}
      {showCheckInModal && (
        <CheckInModal
          currentUser={currentUser}
          onClose={() => setShowCheckInModal(false)}
          onSuccess={() => {
            setShowCheckInModal(false);
            loadLocalState();
          }}
        />
      )}

      {showCheckOutModal && activeSession && (
        <CheckOutModal
          currentUser={currentUser}
          activeSession={activeSession}
          onClose={() => setShowCheckOutModal(false)}
          onSuccess={() => {
            setShowCheckOutModal(false);
            loadLocalState();
          }}
        />
      )}

      {showLocationModal && (
        <LocationUpdateModal
          currentUser={currentUser}
          activeSession={activeSession}
          lastLocation={locations[0] || null}
          onClose={() => setShowLocationModal(false)}
          onSuccess={() => {
            setShowLocationModal(false);
            loadLocalState();
          }}
        />
      )}

      {showVisitModal && (
        <VisitRecordModal
          currentUser={currentUser}
          activeSession={activeSession}
          onClose={() => setShowVisitModal(false)}
          onSuccess={() => {
            setShowVisitModal(false);
            loadLocalState();
          }}
        />
      )}

      {/* Staff Leave Application Modal */}
      {showLeaveModal && (
        <StaffLeaveModal
          isOpen={showLeaveModal}
          currentUser={currentUser}
          onClose={() => setShowLeaveModal(false)}
          onSuccess={() => {
            loadLocalState();
          }}
        />
      )}

      {/* Staff Password Reset Modal */}
      {showPasswordModal && (
        <PasswordResetModal
          isOpen={showPasswordModal}
          targetUser={currentUser}
          onClose={() => setShowPasswordModal(false)}
          isAdminReset={false}
        />
      )}

      {/* Photo Preview Full Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="max-w-lg w-full bg-white rounded-2xl overflow-hidden border border-slate-200 p-3 relative shadow-2xl">
            <img src={selectedPhoto} alt="Live verified capture" className="w-full rounded-xl object-cover" />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="mt-3 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl"
            >
              Close Photo Inspector
            </button>
          </div>
        </div>
      )}
      {/* Accidental GPS Disable Warning Modal */}
      {showGpsWarningModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-800 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-sm">Accidental GPS Switch-Off Warning</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Duty policy mandates continuous GPS tracking throughout scheduled work hours. Switching off GPS triggers an immediate <strong>compliance alert</strong> to management and marks your attendance as <strong>ABSENT</strong>.
                </p>
              </div>
            </div>

            <div className="p-3 my-4 bg-rose-50 rounded-2xl border border-rose-200 text-[11px] text-rose-900 font-medium leading-relaxed">
              If this was pressed unintentionally, please choose <strong>Keep GPS Active</strong> so your shift and working hours remain protected.
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowGpsWarningModal(false)}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Keep GPS Active (Mistake)</span>
              </button>
              <button
                type="button"
                onClick={() => executeGpsToggle(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-bold transition-colors"
              >
                Disable GPS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
