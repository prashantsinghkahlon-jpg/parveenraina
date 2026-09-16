import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  AlertCircle, 
  Filter, 
  Search,
  MessageSquare
} from 'lucide-react';
import { LeaveRequest, LeaveStatus } from '../../types';
import { ApiService } from '../../services/api';

interface LeaveApprovalsPanelProps {
  onRefresh?: () => void;
}

export const LeaveApprovalsPanel: React.FC<LeaveApprovalsPanelProps> = ({ onRefresh }) => {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<'ALL' | LeaveStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [reviewModalLeave, setReviewModalLeave] = useState<LeaveRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchLeaves = async () => {
    try {
      const data = await ApiService.getLeaveRequests();
      setLeaves(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load leave requests:', err);
      setLeaves([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleReview = async (status: 'APPROVED' | 'REJECTED') => {
    if (!reviewModalLeave) return;
    setIsProcessing(true);
    try {
      await ApiService.reviewLeaveRequest(
        reviewModalLeave.id,
        status,
        reviewNotes || undefined,
        'Operations Lead'
      );
      await fetchLeaves();
      onRefresh?.();
      setReviewModalLeave(null);
      setReviewNotes('');
    } catch (err: any) {
      alert(err.message || 'Failed to update leave');
    } finally {
      setIsProcessing(false);
    }
  };

  const safeLeaves = Array.isArray(leaves) ? leaves : [];
  const filteredLeaves = safeLeaves.filter((leave) => {
    if (!leave) return false;
    const matchesStatus = filterStatus === 'ALL' || leave.status === filterStatus;
    const empName = (leave.employeeName || '').toLowerCase();
    const empId = (leave.employeeId || '').toLowerCase();
    const reason = (leave.reason || '').toLowerCase();
    const q = searchTerm.toLowerCase();

    const matchesSearch = 
      empName.includes(q) ||
      empId.includes(q) ||
      reason.includes(q);
    return matchesStatus && matchesSearch;
  });

  const pendingCount = safeLeaves.filter(l => l && l.status === 'PENDING').length;

  return (
    <div className="space-y-5">
      {/* Top Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-slate-900 text-sm">
            Staff Leave Applications ({leaves.length})
          </h3>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-300">
              {pendingCount} Pending Review
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search staff, reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-hidden bg-slate-50 focus:bg-white"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
          >
            <option value="ALL">All Requests</option>
            <option value="PENDING">Pending Only</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Leave Requests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLeaves.map((leave) => (
          <div
            key={leave.id}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs border border-blue-200">
                    {leave.employeeName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{leave.employeeName}</h4>
                    <span className="text-[11px] font-mono text-slate-500">{leave.employeeId}</span>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    leave.status === 'APPROVED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : leave.status === 'REJECTED'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {leave.status}
                </span>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5 text-slate-700 mb-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Leave Type:</span>
                  <strong className="text-slate-900">{leave.leaveType.replace('_', ' ')}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Duration:</span>
                  <span className="font-mono font-bold text-blue-700">
                    {leave.startDate} &rarr; {leave.endDate} ({leave.daysCount} day{leave.daysCount > 1 ? 's' : ''})
                  </span>
                </div>
                <div className="pt-1 text-slate-600 italic">
                  &ldquo;{leave.reason}&rdquo;
                </div>
                {leave.reviewNotes && (
                  <div className="pt-1 text-[11px] text-slate-500 border-t border-slate-200">
                    <strong>Manager Note:</strong> {leave.reviewNotes}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {leave.status === 'PENDING' ? (
              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setReviewModalLeave(leave);
                    setReviewNotes('');
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Review Application
                </button>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between items-center">
                <span>Applied: {new Date(leave.appliedAt).toLocaleDateString()}</span>
                {leave.reviewedBy && <span>By: {leave.reviewedBy}</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Review Modal */}
      {reviewModalLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Review Leave Application: {reviewModalLeave.employeeName}
            </h3>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div><strong>Dates:</strong> {reviewModalLeave.startDate} to {reviewModalLeave.endDate} ({reviewModalLeave.daysCount} days)</div>
              <div><strong>Type:</strong> {reviewModalLeave.leaveType}</div>
              <div><strong>Reason:</strong> {reviewModalLeave.reason}</div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Manager Remarks / Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="e.g. Approved. Reliever allocated."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReviewModalLeave(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleReview('REJECTED')}
                className="px-3.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl transition-colors"
              >
                Reject Leave
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleReview('APPROVED')}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors"
              >
                Approve Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
