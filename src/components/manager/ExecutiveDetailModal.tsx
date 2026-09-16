import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Camera, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  Navigation, 
  Phone, 
  Mail, 
  Play, 
  Calendar, 
  TrendingUp,
  Activity,
  CheckCircle,
  Eye
} from 'lucide-react';
import { User, LocationRecord, FieldVisit, WorkSession, DailyActivitySummary } from '../../types';
import { ApiService } from '../../services/api';

interface ExecutiveDetailModalProps {
  executiveId: string;
  onClose: () => void;
  onOpenPlayback: (executiveId: string) => void;
  onViewPhoto: (photoUrl: string) => void;
}

export const ExecutiveDetailModal: React.FC<ExecutiveDetailModalProps> = ({
  executiveId,
  onClose,
  onOpenPlayback,
  onViewPhoto,
}) => {
  const [data, setData] = useState<{
    user: User;
    activeSession: WorkSession | null;
    recentLocations: LocationRecord[];
    visits: FieldVisit[];
    summary: DailyActivitySummary;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    ApiService.getExecutiveDetails(executiveId)
      .then(setData)
      .catch(console.warn)
      .finally(() => setIsLoading(false));
  }, [executiveId]);

  if (isLoading || !data) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center text-slate-700 shadow-xl">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold">Loading Executive Telemetry...</p>
        </div>
      </div>
    );
  }

  const { user, activeSession, recentLocations, visits, summary } = data;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-lg shadow-xs">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base sm:text-lg text-slate-900">{user.name}</h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-xs font-mono text-blue-700 font-bold border border-blue-200">
                  {user.employeeId}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  user.currentStatus === 'CHECKED_IN' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-600'
                }`}>
                  {user.currentStatus || 'ACTIVE'}
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                <span>{user.email}</span>
                <span>&bull;</span>
                <span>{user.mobile}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenPlayback(user.id);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Route Replay</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Summary KPIs Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 block">Check-In Time</span>
              <span className="text-xs font-bold text-slate-800 mt-1 block font-mono">
                {activeSession ? new Date(activeSession.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not Checked In'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 block">Total Distance</span>
              <span className="text-xs font-bold text-blue-600 mt-1 block font-mono">
                {summary.totalDistanceKm} km
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 block">Location Points</span>
              <span className="text-xs font-bold text-slate-800 mt-1 block font-mono">
                {recentLocations.length} points
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 block">Field Visits</span>
              <span className="text-xs font-bold text-green-600 mt-1 block font-mono">
                {visits.length} verified
              </span>
            </div>
          </div>

          {/* Movement Timeline Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Chronological Field Activity Log
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                {recentLocations.length + visits.length} Total Records Today
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">Event Type</th>
                      <th className="py-2.5 px-3">GPS Location &amp; Accuracy</th>
                      <th className="py-2.5 px-3">Photo &amp; Verification</th>
                      <th className="py-2.5 px-3">Remarks / Customer</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      ...visits.map(v => ({ type: 'VISIT' as const, data: v, time: v.capturedAt })),
                      ...recentLocations.map(l => ({ type: 'LOCATION' as const, data: l, time: l.capturedAt })),
                    ]
                      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                      .map((item, idx) => {
                        if (item.type === 'VISIT') {
                          const v = item.data as FieldVisit;
                          return (
                            <tr key={`visit-${v.id || idx}`} className="hover:bg-slate-50 bg-teal-50/40 transition-colors">
                              <td className="py-2.5 px-3 font-mono text-[11px] text-teal-700 font-bold whitespace-nowrap">
                                {new Date(v.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold text-[10px] border border-teal-200">
                                  FIELD VISIT
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                                {v.latitude.toFixed(5)}, {v.longitude.toFixed(5)} (&plusmn;{Math.round(v.accuracy)}m)
                              </td>
                              <td className="py-2.5 px-3">
                                {v.photoUrl ? (
                                  <button
                                    onClick={() => onViewPhoto(v.photoUrl)}
                                    className="flex items-center gap-1.5 text-[11px] text-blue-600 hover:text-blue-700 font-bold"
                                  >
                                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                                      <img src={v.photoUrl} alt="visit" className="w-full h-full object-cover" />
                                    </div>
                                    <span>Inspect</span>
                                  </button>
                                ) : (
                                  <span className="text-slate-400">No photo</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900">{v.visitName}</div>
                                {v.remarks && <div className="text-[11px] text-slate-500 truncate max-w-xs">{v.remarks}</div>}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-bold text-[10px] border border-green-200">
                                  SYNCED
                                </span>
                              </td>
                            </tr>
                          );
                        } else {
                          const l = item.data as LocationRecord;
                          return (
                            <tr key={`loc-${l.id || idx}`} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                {new Date(l.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-[10px] border border-blue-200">
                                  GPS UPDATE
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                                {l.latitude.toFixed(5)}, {l.longitude.toFixed(5)} (&plusmn;{Math.round(l.accuracy)}m)
                              </td>
                              <td className="py-2.5 px-3 text-slate-400 text-[11px]">--</td>
                              <td className="py-2.5 px-3 text-slate-700">
                                {l.locationName || l.remarks || 'Regular GPS ping'}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-bold text-[10px] border border-green-200">
                                  {l.syncStatus}
                                </span>
                              </td>
                            </tr>
                          );
                        }
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
