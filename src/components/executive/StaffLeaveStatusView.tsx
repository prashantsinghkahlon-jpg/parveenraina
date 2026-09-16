import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  User, 
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import { User as UserType, LeaveRequest, LeaveStatus } from '../../types';
import { ApiService } from '../../services/api';

interface StaffLeaveStatusViewProps {
  currentUser: UserType;
  onApplyNewLeave: () => void;
}

export const StaffLeaveStatusView: React.FC<StaffLeaveStatusViewProps> = ({
  currentUser,
  onApplyNewLeave,
}) => {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'ALL' | LeaveStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchMyLeaves = async () => {
    setIsLoading(true);
    try {
      const data = await ApiService.getLeaveRequests(currentUser.id);
      setLeaves(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to load my leaves:', err);
      setLeaves([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyLeaves();
  }, [currentUser.id]);

  const safeLeaves = Array.isArray(leaves) ? leaves : [];
  const filtered = safeLeaves.filter(l => {
    if (!l) return false;
    const matchesStatus = filterStatus === 'ALL' || l.status === filterStatus;
    const term = searchTerm.toLowerCase();
    const reason = (l.reason || '').toLowerCase();
    const type = (l.leaveType || '').toLowerCase();
    return matchesStatus && (reason.includes(term) || type.includes(term));
  });

  const entitlement = currentUser.leavesEntitlement || {
    casual: 12,
    sick: 8,
    earned: 15,
    usedCasual: 0,
    usedSick: 0,
    usedEarned: 0,
  };

  const remainingCasual = Math.max(0, entitlement.casual - (entitlement.usedCasual || 0));
  const remainingSick = Math.max(0, entitlement.sick - (entitlement.usedSick || 0));
  const remainingEarned = Math.max(0, entitlement.earned - (entitlement.usedEarned || 0));

  const pendingCount = safeLeaves.filter(l => l.status === 'PENDING').length;
  const approvedCount = safeLeaves.filter(l => l.status === 'APPROVED').length;
  const rejectedCount = safeLeaves.filter(l => l.status === 'REJECTED').length;

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Header & Apply Button */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">My Leave Applications &amp; Balances</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Track submitted requests, manager review remarks, and remaining annual time-off balance.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={fetchMyLeaves}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors"
            title="Refresh Leave List"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          <button
            onClick={onApplyNewLeave}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Apply New Leave</span>
          </button>
        </div>
      </div>

      {/* Leave Entitlement Balance Chips */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5 space-y-1">
          <div className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Casual Leave (CL)</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-blue-900">{remainingCasual}</span>
            <span className="text-xs text-blue-600">/ {entitlement.casual} total</span>
          </div>
          <div className="text-[10px] text-blue-700">Used: {entitlement.usedCasual || 0} days</div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 space-y-1">
          <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Sick Leave (SL)</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-emerald-900">{remainingSick}</span>
            <span className="text-xs text-emerald-600">/ {entitlement.sick} total</span>
          </div>
          <div className="text-[10px] text-emerald-700">Used: {entitlement.usedSick || 0} days</div>
        </div>

        <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-3.5 space-y-1">
          <div className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">Earned Leave (EL)</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-purple-900">{remainingEarned}</span>
            <span className="text-xs text-purple-600">/ {entitlement.earned} total</span>
          </div>
          <div className="text-[10px] text-purple-700">Used: {entitlement.usedEarned || 0} days</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-xs">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors shrink-0 ${
              filterStatus === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({safeLeaves.length})
          </button>
          <button
            onClick={() => setFilterStatus('PENDING')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors shrink-0 flex items-center gap-1 ${
              filterStatus === 'PENDING'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Pending ({pendingCount})</span>
          </button>
          <button
            onClick={() => setFilterStatus('APPROVED')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors shrink-0 flex items-center gap-1 ${
              filterStatus === 'APPROVED'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Approved ({approvedCount})</span>
          </button>
          <button
            onClick={() => setFilterStatus('REJECTED')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors shrink-0 flex items-center gap-1 ${
              filterStatus === 'REJECTED'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <XCircle className="w-3 h-3" />
            <span>Rejected ({rejectedCount})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-56">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search reasons or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
          />
        </div>
      </div>

      {/* Leaves List */}
      {isLoading ? (
        <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading your applications...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">No Leave Applications Found</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {filterStatus !== 'ALL'
                ? `You have no ${filterStatus.toLowerCase()} applications.`
                : 'You have not submitted any leave requests yet.'}
            </p>
          </div>
          <button
            onClick={onApplyNewLeave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Apply Now</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((leave) => {
            const isPending = leave.status === 'PENDING';
            const isApproved = leave.status === 'APPROVED';
            const isRejected = leave.status === 'REJECTED';

            return (
              <div
                key={leave.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 shadow-xs transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 font-bold text-[10px] rounded-md uppercase tracking-wider">
                        {leave.leaveType} LEAVE
                      </span>
                      <strong className="text-xs font-bold text-slate-900">
                        {leave.startDate} &rarr; {leave.endDate}
                      </strong>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-mono text-[10px] font-bold rounded-md border border-blue-200">
                        {leave.daysCount} Calendar Day{leave.daysCount > 1 ? 's' : ''}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed pt-0.5">
                      <strong>Reason:</strong> {leave.reason}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0">
                    {isPending && (
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Under Review</span>
                      </span>
                    )}
                    {isApproved && (
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Approved</span>
                      </span>
                    )}
                    {isRejected && (
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-300 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        <span>Rejected</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Review Details / Remarks Box if processed */}
                {(leave.reviewedBy || leave.reviewNotes) && (
                  <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                    isApproved ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' : 'bg-rose-50/60 border-rose-200 text-rose-900'
                  }`}>
                    <div className="flex items-center justify-between text-[10px] font-bold opacity-80">
                      <span>Reviewed by: {leave.reviewedBy || 'Operations Lead'}</span>
                      {leave.reviewedAt && (
                        <span>{new Date(leave.reviewedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    {leave.reviewNotes && (
                      <p className="text-xs italic">
                        "{leave.reviewNotes}"
                      </p>
                    )}
                  </div>
                )}

                {/* Bottom Meta */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                  <span>Application ID: {leave.id}</span>
                  <span>Submitted: {new Date(leave.appliedAt).toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
