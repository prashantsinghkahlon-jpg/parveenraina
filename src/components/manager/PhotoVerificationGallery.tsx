import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Check, 
  X, 
  Filter, 
  User as UserIcon,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { FieldVisit, User } from '../../types';
import { ApiService } from '../../services/api';

interface PhotoVerificationGalleryProps {
  executives: User[];
  onOpenPhotoModal: (photoUrl: string) => void;
}

export const PhotoVerificationGallery: React.FC<PhotoVerificationGalleryProps> = ({
  executives,
  onOpenPhotoModal,
}) => {
  const [visits, setVisits] = useState<FieldVisit[]>([]);
  const [selectedExecId, setSelectedExecId] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [filterVerified, setFilterVerified] = useState<'ALL' | 'VERIFIED' | 'PENDING'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Inspector modal
  const [inspectingVisit, setInspectingVisit] = useState<FieldVisit | null>(null);
  const [managerNotes, setManagerNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const loadVisits = async () => {
    setIsLoading(true);
    try {
      const data = await ApiService.getAllVisits({
        executiveId: selectedExecId !== 'ALL' ? selectedExecId : undefined,
        date: selectedDate || undefined,
        verified: filterVerified === 'VERIFIED' ? true : filterVerified === 'PENDING' ? false : undefined,
      });
      setVisits(data);
    } catch (err) {
      console.warn('Failed to load visits:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVisits();
  }, [selectedExecId, selectedDate, filterVerified]);

  const handleVerify = async (verified: boolean) => {
    if (!inspectingVisit) return;
    setIsUpdating(true);
    try {
      const updated = await ApiService.verifyVisit(inspectingVisit.id, verified, managerNotes.trim() || undefined);
      setVisits(prev => prev.map(v => v.id === updated.id ? updated : v));
      setInspectingVisit(null);
      setManagerNotes('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4 text-slate-800">
      {/* Top Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Executive Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
              Field Executive
            </label>
            <select
              value={selectedExecId}
              onChange={(e) => setSelectedExecId(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
            >
              <option value="ALL">All Executives</option>
              {executives.map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>
              ))}
            </select>
          </div>

          {/* Verification Status Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
              Verification Status
            </label>
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setFilterVerified('ALL')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  filterVerified === 'ALL' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterVerified('PENDING')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  filterVerified === 'PENDING' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending Review
              </button>
              <button
                onClick={() => setFilterVerified('VERIFIED')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  filterVerified === 'VERIFIED' ? 'bg-green-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Verified
              </button>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Showing <strong className="text-slate-900 font-bold">{visits.length}</strong> Captured Visit Photos
        </div>
      </div>

      {/* Photos Grid */}
      {visits.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
          <Camera className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-700">No field visit photos found</p>
          <p className="text-[11px] text-slate-500 mt-1">Try clearing filters or recording new visits.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visits.map((visit) => (
            <div
              key={visit.id}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl overflow-hidden shadow-xs transition-all flex flex-col group"
            >
              {/* Photo Image Card */}
              <div 
                className="relative aspect-4/3 bg-slate-900 cursor-pointer overflow-hidden"
                onClick={() => {
                  setInspectingVisit(visit);
                  setManagerNotes(visit.managerNotes || '');
                }}
              >
                <img
                  src={visit.photoUrl}
                  alt={visit.visitName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Verification Badge Overlay */}
                <div className="absolute top-3 left-3">
                  {visit.verifiedByManager ? (
                    <span className="px-2.5 py-1 rounded-full bg-green-500 text-white font-extrabold text-[10px] flex items-center gap-1 shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white font-extrabold text-[10px] flex items-center gap-1 shadow-xs">
                      <AlertCircle className="w-3.5 h-3.5" /> NEEDS REVIEW
                    </span>
                  )}
                </div>

                {/* Timestamp tag */}
                <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-lg text-[10px] font-mono text-white font-bold">
                  {new Date(visit.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 truncate max-w-[180px]">
                      {visit.visitName}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold border border-blue-200">
                      {visit.employeeId}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-600 mt-1 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span className="truncate">{visit.locationName || 'Field Location'}</span>
                  </div>

                  <div className="font-mono text-[10px] text-slate-400 mt-1">
                    Lat: {visit.latitude.toFixed(5)}, Lng: {visit.longitude.toFixed(5)} (&plusmn;{Math.round(visit.accuracy)}m)
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setInspectingVisit(visit);
                      setManagerNotes(visit.managerNotes || '');
                    }}
                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-blue-600 font-bold text-xs rounded-xl border border-slate-200 transition-colors text-center"
                  >
                    Inspect &amp; Verify Telemetry
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verification Inspector Modal */}
      {inspectingVisit && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 text-slate-800">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl space-y-4 p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-blue-600" />
                <h3 className="font-bold text-base text-slate-900">Visit Photo Verification</h3>
              </div>
              <button
                onClick={() => setInspectingVisit(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Photo Preview Container */}
            <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-200 shadow-xs">
              <img src={inspectingVisit.photoUrl} alt="Inspection" className="w-full h-full object-cover" />
            </div>

            {/* EXIF Metadata breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Executive</span>
                <span className="text-slate-900 font-bold mt-0.5 block">{inspectingVisit.employeeName} ({inspectingVisit.employeeId})</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Capture Time</span>
                <span className="text-blue-600 font-mono font-bold mt-0.5 block">{new Date(inspectingVisit.capturedAt).toLocaleString()}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">GPS Accuracy</span>
                <span className="text-green-700 font-mono font-bold mt-0.5 block">&plusmn;{Math.round(inspectingVisit.accuracy)} meters</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 col-span-2 sm:col-span-3">
                <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Coordinates</span>
                <span className="text-slate-700 font-mono mt-0.5 block">
                  Latitude: {inspectingVisit.latitude.toFixed(6)} | Longitude: {inspectingVisit.longitude.toFixed(6)}
                </span>
              </div>
            </div>

            {/* Remarks */}
            {inspectingVisit.remarks && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <span className="text-[10px] text-slate-500 font-bold block mb-1 uppercase tracking-wider">Executive Notes</span>
                <p className="text-slate-700 italic">"{inspectingVisit.remarks}"</p>
              </div>
            )}

            {/* Manager Notes input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Project Manager Verification Note
              </label>
              <input
                type="text"
                value={managerNotes}
                onChange={(e) => setManagerNotes(e.target.value)}
                placeholder="e.g. Cross-verified with receptionist log; authorized sample dispatch."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleVerify(false)}
                className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-colors"
              >
                Flag for Inquiry
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleVerify(true)}
                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition-all"
              >
                <Check className="w-4 h-4" />
                <span>APPROVE &amp; VERIFY</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
