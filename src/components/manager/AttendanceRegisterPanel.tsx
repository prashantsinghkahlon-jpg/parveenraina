import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Calendar, 
  Download, 
  Search, 
  Printer, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  UserX, 
  ShieldCheck, 
  CalendarOff,
  Filter,
  RefreshCw,
  MapPin,
  Camera
} from 'lucide-react';
import { AttendanceRegisterRecord } from '../../types';
import { ApiService } from '../../services/api';
import { useOrganization } from '../../context/OrganizationContext';

interface AttendanceRegisterPanelProps {
  is16to9Mode?: boolean;
}

export const AttendanceRegisterPanel: React.FC<AttendanceRegisterPanelProps> = ({ is16to9Mode }) => {
  const { company } = useOrganization();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<AttendanceRegisterRecord[]>([]);
  const [summary, setSummary] = useState({
    totalStaff: 0,
    presentCount: 0,
    lateCount: 0,
    halfDayCount: 0,
    absentCount: 0,
    onLeaveCount: 0,
    weeklyOffCount: 0,
    totalWorkingHours: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'ON_LEAVE' | 'WEEKLY_OFF'>('ALL');

  const loadAttendance = async () => {
    setIsLoading(true);
    try {
      const data = await ApiService.getAttendanceRegister(selectedDate);
      setRecords(Array.isArray(data?.records) ? data.records : []);
      if (data?.summary) {
        setSummary(data.summary);
      }
    } catch (err) {
      console.warn('Failed to load attendance register:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [selectedDate]);

  // Export to Excel / CSV format
  const handleExportCSV = () => {
    if (records.length === 0) {
      alert('No attendance records to export for this date.');
      return;
    }

    const headers = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Designation',
      'Date',
      'Shift',
      'Scheduled Start',
      'Scheduled End',
      'In Time',
      'Out Time',
      'Total Working Hours',
      'Status',
      'Late Minutes',
      'Overtime Hours',
      'GPS Continuity',
      'Verified Visits',
      'Remarks'
    ];

    const rows = records.map(r => [
      `"${r.employeeId || ''}"`,
      `"${(r.employeeName || '').replace(/"/g, '""')}"`,
      `"${(r.departmentName || '').replace(/"/g, '""')}"`,
      `"${(r.designationTitle || '').replace(/"/g, '""')}"`,
      `"${r.date}"`,
      `"${(r.shiftName || '').replace(/"/g, '""')}"`,
      `"${r.scheduledStart}"`,
      `"${r.scheduledEnd}"`,
      `"${r.inTime || 'N/A'}"`,
      `"${r.outTime || 'N/A'}"`,
      r.workingHours,
      `"${r.status}"`,
      r.lateMinutes,
      r.overtimeHours,
      `"${r.gpsContinuity}"`,
      r.verifiedVisits,
      `"${(r.remarks || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Attendance_Register_${company.name.replace(/\s+/g, '_')}_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filter records
  const filteredRecords = records.filter(r => {
    const matchesSearch = 
      r.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.departmentName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: AttendanceRegisterRecord['status']) => {
    switch (status) {
      case 'PRESENT':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-50 text-green-700 border border-green-200">PRESENT</span>;
      case 'LATE':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">LATE</span>;
      case 'HALF_DAY':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">HALF DAY</span>;
      case 'ABSENT':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">ABSENT</span>;
      case 'ON_LEAVE':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">ON LEAVE</span>;
      case 'WEEKLY_OFF':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">WEEKLY OFF</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">{status}</span>;
    }
  };

  return (
    <div className={`space-y-4 ${is16to9Mode ? 'text-slate-100' : 'text-slate-800'}`}>
      {/* Header & Controls */}
      <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 shadow-xs ${
        is16to9Mode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base tracking-tight">Daily Attendance Register & Verification</h3>
            <p className="text-xs opacity-70">
              Shift timetable, In/Out punches, working duration & GPS continuity tracking
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-inherit text-xs font-bold focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadAttendance}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-inherit transition-colors"
            title="Refresh Attendance"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Export to Excel / CSV */}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <div className={`p-3 rounded-xl border shadow-xs ${is16to9Mode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 block">Total Staff</span>
          <span className="text-xl font-black font-mono mt-1 block">{summary.totalStaff}</span>
          <span className="text-[10px] opacity-70">Roster Headcount</span>
        </div>

        <div className={`p-3 rounded-xl border shadow-xs ${is16to9Mode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 block">Present</span>
          <span className="text-xl font-black font-mono mt-1 block text-green-600">{summary.presentCount}</span>
          <span className="text-[10px] text-green-600 font-medium">Duty Completed</span>
        </div>

        <div className={`p-3 rounded-xl border shadow-xs ${is16to9Mode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">Late In</span>
          <span className="text-xl font-black font-mono mt-1 block text-amber-600">{summary.lateCount}</span>
          <span className="text-[10px] text-amber-600 font-medium">After Grace Period</span>
        </div>

        <div className={`p-3 rounded-xl border shadow-xs ${is16to9Mode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 block">Half Day</span>
          <span className="text-xl font-black font-mono mt-1 block text-orange-600">{summary.halfDayCount}</span>
          <span className="text-[10px] text-orange-600 font-medium">&lt; Threshold Hours</span>
        </div>

        <div className={`p-3 rounded-xl border shadow-xs ${is16to9Mode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">Absent</span>
          <span className="text-xl font-black font-mono mt-1 block text-rose-600">{summary.absentCount}</span>
          <span className="text-[10px] text-rose-600 font-medium">No Punch Recorded</span>
        </div>

        <div className={`p-3 rounded-xl border shadow-xs ${is16to9Mode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 block">On Leave</span>
          <span className="text-xl font-black font-mono mt-1 block text-purple-600">{summary.onLeaveCount}</span>
          <span className="text-[10px] text-purple-600 font-medium">Approved Leaves</span>
        </div>

        <div className={`p-3 rounded-xl border shadow-xs ${is16to9Mode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 block">Total Hours</span>
          <span className="text-xl font-black font-mono mt-1 block text-blue-600">{summary.totalWorkingHours}h</span>
          <span className="text-[10px] opacity-70">Cumulative Duty</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
        is16to9Mode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by staff name, ID or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-inherit focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold">
          <span className="text-slate-400 px-1">Status:</span>
          {(['ALL', 'PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'ON_LEAVE', 'WEEKLY_OFF'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2.5 py-1 rounded-lg border transition-colors shrink-0 ${
                statusFilter === status 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Attendance Register Table */}
      <div className={`rounded-2xl border overflow-hidden shadow-xs ${
        is16to9Mode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b font-bold tracking-wider uppercase text-[10px] ${
                is16to9Mode ? 'bg-slate-800/80 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department & Role</th>
                <th className="py-3 px-4">Shift Timings</th>
                <th className="py-3 px-4">In Time (Punch)</th>
                <th className="py-3 px-4">Out Time</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">GPS Continuity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Loading attendance records...</span>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <CalendarOff className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <span>No employee attendance records found for this date.</span>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr 
                    key={record.id}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                      record.status === 'ABSENT' ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{record.employeeName}</div>
                      <div className="text-[10px] font-mono text-blue-600 dark:text-blue-400">{record.employeeId}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-inherit">{record.departmentName}</div>
                      <div className="text-[10px] opacity-70">{record.designationTitle}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-inherit">{record.shiftName}</div>
                      <div className="text-[10px] font-mono opacity-70">
                        {record.scheduledStart} - {record.scheduledEnd}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {record.inTime ? (
                        <div>
                          <span className="font-bold font-mono text-inherit">{record.inTime}</span>
                          {record.lateMinutes > 0 && (
                            <span className="block text-[10px] text-amber-600 font-bold">
                              +{record.lateMinutes}m Late
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono">--:--</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {record.outTime ? (
                        <span className="font-bold font-mono text-inherit">{record.outTime}</span>
                      ) : (
                        <span className="text-slate-400 font-mono">--:--</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold font-mono text-blue-600 dark:text-blue-400">
                        {record.workingHours > 0 ? `${record.workingHours} hrs` : '0 hrs'}
                      </span>
                      {record.overtimeHours > 0 && (
                        <span className="block text-[10px] text-emerald-600 font-bold">
                          +{record.overtimeHours}h OT
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {record.gpsContinuity === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-600">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          <span>Active</span>
                        </span>
                      ) : record.gpsContinuity === 'VIOLATED' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                          <span>Violation</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Offline</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {getStatusBadge(record.status)}
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-[11px] opacity-80">{record.remarks || '-'}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
