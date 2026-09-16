import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Calendar, 
  Filter, 
  User as UserIcon,
  TrendingUp,
  MapPin,
  Camera,
  Clock
} from 'lucide-react';
import { DailyActivitySummary, User } from '../../types';
import { ApiService } from '../../services/api';

interface ReportsExportProps {
  executives: User[];
}

export const ReportsExport: React.FC<ReportsExportProps> = ({ executives }) => {
  const [summaries, setSummaries] = useState<DailyActivitySummary[]>([]);
  const [selectedExecId, setSelectedExecId] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isLoading, setIsLoading] = useState(true);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const data = await ApiService.getDailyReports(selectedDate);
      setSummaries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to load reports:', err);
      setSummaries([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [selectedDate]);

  const safeSummaries = Array.isArray(summaries) ? summaries : [];
  const filteredSummaries = selectedExecId === 'ALL' 
    ? safeSummaries 
    : safeSummaries.filter(s => s && s.userId === selectedExecId);

  // CSV Exporter
  const exportToCsv = () => {
    const headers = [
      'Date',
      'Employee ID',
      'Employee Name',
      'Check-In Time',
      'Check-Out Time',
      'Duration (Hours)',
      'Total Distance (KM)',
      'Total Location Updates',
      'Total Field Visits',
      'Sync Status',
    ];

    const rows = filteredSummaries.map(s => {
      const checkIn = s.checkInTime || (s as any).firstCheckInTime;
      const checkOut = s.checkOutTime || (s as any).lastCheckOutTime;
      const durMin = s.durationMinutes ?? (s as any).totalDurationMinutes ?? 0;
      const updates = s.totalUpdates ?? (s as any).totalLocationUpdates ?? 0;

      return [
        s.date,
        s.employeeId,
        `"${s.employeeName}"`,
        checkIn ? new Date(checkIn).toLocaleTimeString() : 'N/A',
        checkOut ? new Date(checkOut).toLocaleTimeString() : 'Active/N/A',
        (durMin / 60).toFixed(2),
        s.totalDistanceKm.toFixed(2),
        updates,
        s.totalVisits,
        s.syncStatus || 'SYNCED',
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FieldTrack_Report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="space-y-4 text-slate-800">
      {/* Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
              Report Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

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
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCsv}
            className="px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export to CSV / Excel</span>
          </button>
          <button
            onClick={printReport}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-200 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print View</span>
          </button>
        </div>
      </div>

      {/* Report Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Daily Field Activity &amp; Visit Report</h3>
            <p className="text-xs text-slate-500">Aggregated tracking logs for {selectedDate}</p>
          </div>
          <span className="px-3 py-1 bg-blue-50 text-blue-700 font-mono text-xs font-bold rounded-xl border border-blue-200">
            {filteredSummaries.length} Records Generated
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Executive</th>
                <th className="py-3 px-4">Check-In</th>
                <th className="py-3 px-4">Check-Out</th>
                <th className="py-3 px-4 text-right">Distance (km)</th>
                <th className="py-3 px-4 text-center">GPS Points</th>
                <th className="py-3 px-4 text-center">Visits Verified</th>
                <th className="py-3 px-4 text-center">Sync Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSummaries.map((summary, idx) => {
                const rowKey = summary.userId ? `${summary.userId}-${summary.date || selectedDate}` : `${summary.employeeId}-${idx}`;
                const checkIn = summary.checkInTime || (summary as any).firstCheckInTime;
                const checkOut = summary.checkOutTime || (summary as any).lastCheckOutTime;
                const totalUpdates = summary.totalUpdates ?? (summary as any).totalLocationUpdates ?? 0;
                const pendingSyncs = (summary as any).pendingSyncCount ?? 0;

                return (
                  <tr key={rowKey} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{summary.employeeName}</div>
                      <div className="text-[10px] font-mono text-blue-600 font-bold">{summary.employeeId}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {checkIn ? new Date(checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {checkOut ? new Date(checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active Shift'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-600">
                      {summary.totalDistanceKm.toFixed(1)} km
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                      {totalUpdates}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 font-bold text-[11px] border border-teal-200">
                        {summary.totalVisits} visits
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {pendingSyncs > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200">
                          {pendingSyncs} Pending
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-bold text-[10px] border border-green-200">
                          Synced
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
