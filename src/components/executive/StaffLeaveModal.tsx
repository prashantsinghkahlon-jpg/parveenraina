import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  X, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  Briefcase
} from 'lucide-react';
import { User, LeaveType } from '../../types';
import { ApiService } from '../../services/api';

interface StaffLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSuccess?: () => void;
}

export const StaffLeaveModal: React.FC<StaffLeaveModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSuccess,
}) => {
  const [leaveType, setLeaveType] = useState<LeaveType>('CASUAL');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  // Calculate days difference
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const calculatedDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (new Date(endDate) < new Date(startDate)) {
        throw new Error('End date cannot be prior to start date.');
      }
      if (!reason.trim()) {
        throw new Error('Please enter a brief explanation for your leave application.');
      }

      await ApiService.submitLeaveRequest({
        userId: currentUser.id,
        employeeName: currentUser.name,
        employeeId: currentUser.employeeId,
        staffType: currentUser.staffType || 'FIELD_STAFF',
        leaveType,
        startDate,
        endDate,
        daysCount: calculatedDays,
        reason: reason.trim(),
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit leave request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const clBalance = currentUser.leavesEntitlement?.casual ?? 12;
  const slBalance = currentUser.leavesEntitlement?.sick ?? 8;
  const elBalance = currentUser.leavesEntitlement?.earned ?? 15;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Apply for Leave / Time-Off</h3>
            <p className="text-xs text-slate-500">Official leave application submitted to Operations Lead</p>
          </div>
        </div>

        {/* Quota Balances Bar */}
        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center mb-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Casual (CL)</span>
            <span className="text-xs font-bold text-blue-700 font-mono">{clBalance} left</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Sick (SL)</span>
            <span className="text-xs font-bold text-emerald-700 font-mono">{slBalance} left</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Earned (EL)</span>
            <span className="text-xs font-bold text-purple-700 font-mono">{elBalance} left</span>
          </div>
        </div>

        {success ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-xs font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Your leave request has been submitted successfully for manager approval!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Select Leave Type *
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
              >
                <option value="CASUAL">Casual Leave (Personal / Urgent)</option>
                <option value="SICK">Sick / Medical Leave</option>
                <option value="EARNED">Earned / Privilege Leave (Vacation)</option>
                <option value="HALF_DAY">Half-Day Leave</option>
                <option value="SPECIAL">Special Assignment / Compensatory Off</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            <div className="bg-blue-50/70 border border-blue-200 rounded-xl px-3 py-2 text-xs flex justify-between items-center text-blue-900">
              <span className="font-medium">Total Leave Duration:</span>
              <strong className="font-mono text-sm">{calculatedDays} Calendar Day{calculatedDays > 1 ? 's' : ''}</strong>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Reason / Remarks *
              </label>
              <textarea
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly state reason for taking leave..."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-hidden resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Submit Application
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
