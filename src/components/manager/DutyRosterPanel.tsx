import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Save, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  Sparkles,
  RotateCw,
  Sun,
  Moon,
  Coffee,
  X
} from 'lucide-react';
import { User, ShiftMaster, DutyRosterItem, DepartmentMaster } from '../../types';
import { ApiService } from '../../services/api';

interface DutyRosterPanelProps {
  executives: User[];
  is16to9Mode?: boolean;
}

export const DutyRosterPanel: React.FC<DutyRosterPanelProps> = ({
  executives,
  is16to9Mode
}) => {
  // Shifts from masters
  const [shifts, setShifts] = useState<ShiftMaster[]>([]);
  const [departments, setDepartments] = useState<DepartmentMaster[]>([]);
  const [rosters, setRosters] = useState<DutyRosterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Selected Week Start Date (Monday)
  const [weekStartDate, setWeekStartDate] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  });

  // Filter
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');

  // Quick Bulk Allocation Modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkStaffSelection, setBulkStaffSelection] = useState<'ALL' | string>('ALL');
  const [bulkShiftId, setBulkShiftId] = useState<string>('');
  const [bulkIncludeWeekends, setBulkIncludeWeekends] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Compute 7 days of the selected week
  const weekDays = React.useMemo(() => {
    const days = [];
    const base = new Date(weekStartDate + 'T00:00:00');
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      days.push({
        dateStr: d.toISOString().split('T')[0],
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        monthName: d.toLocaleDateString('en-US', { month: 'short' }),
        isToday: d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0],
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      });
    }
    return days;
  }, [weekStartDate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allShifts, allDepts, allRosters] = await Promise.all([
        ApiService.getShifts().catch(() => []),
        ApiService.getDepartments().catch(() => []),
        ApiService.getRosters().catch(() => []),
      ]);

      const safeShifts = Array.isArray(allShifts) && allShifts.length > 0 ? allShifts : [
        { id: 'sh-std', code: 'STD', name: 'Standard General Shift', startTime: '09:00', endTime: '18:00', gracePeriodMinutes: 15, halfDayThresholdHours: 4.5, fullDayHours: 8.5 },
        { id: 'sh-morn', code: 'MRN', name: 'Early Dispatch Shift', startTime: '07:30', endTime: '16:00', gracePeriodMinutes: 15, halfDayThresholdHours: 4.5, fullDayHours: 8.5 },
        { id: 'sh-eve', code: 'EVE', name: 'Evening Field Shift', startTime: '13:00', endTime: '21:30', gracePeriodMinutes: 15, halfDayThresholdHours: 4.5, fullDayHours: 8.5 }
      ];

      setShifts(safeShifts);
      setDepartments(Array.isArray(allDepts) ? allDepts : []);
      setRosters(Array.isArray(allRosters) ? allRosters : []);
      if (!bulkShiftId && safeShifts[0]) {
        setBulkShiftId(safeShifts[0].id);
      }
    } catch (err) {
      console.warn('Failed to load roster data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Navigate Weeks
  const handlePrevWeek = () => {
    const d = new Date(weekStartDate + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    setWeekStartDate(d.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const d = new Date(weekStartDate + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    setWeekStartDate(d.toISOString().split('T')[0]);
  };

  const handleCurrentWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    setWeekStartDate(monday.toISOString().split('T')[0]);
  };

  // Find Roster item for employee on specific date
  const getRosterForCell = (userId: string, dateStr: string): DutyRosterItem | undefined => {
    return rosters.find(r => r.userId === userId && r.date === dateStr);
  };

  // Change Shift for specific employee on specific date
  const handleCellShiftChange = async (user: User, dateStr: string, nextShiftId: string) => {
    const targetShift = shifts.find(s => s.id === nextShiftId);
    const isOff = nextShiftId === 'OFF';

    const newRosterItem: DutyRosterItem = {
      id: `ros-${user.id}-${dateStr}`,
      userId: user.id,
      employeeId: user.employeeId,
      employeeName: user.name,
      shiftId: isOff ? '' : (targetShift?.id || shifts[0]?.id || ''),
      shiftName: isOff ? 'Weekly Off' : (targetShift?.name || 'Standard Shift'),
      startTime: isOff ? '' : (targetShift?.startTime || '09:00'),
      endTime: isOff ? '' : (targetShift?.endTime || '18:00'),
      date: dateStr,
      isWeeklyOff: isOff,
      notes: isOff ? 'Weekly Rest Day' : '',
    };

    // Optimistically update local state
    setRosters(prev => {
      const idx = prev.findIndex(r => r.userId === user.id && r.date === dateStr);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newRosterItem;
        return copy;
      }
      return [...prev, newRosterItem];
    });

    try {
      await ApiService.saveRosters(newRosterItem);
    } catch (err) {
      console.warn('Failed to save roster cell:', err);
    }
  };

  // Bulk Apply Roster
  const handleApplyBulkRoster = async () => {
    setIsSaving(true);
    try {
      const targetEmployees = bulkStaffSelection === 'ALL' 
        ? executives 
        : executives.filter(e => e.id === bulkStaffSelection);
      
      const targetShift = shifts.find(s => s.id === bulkShiftId) || shifts[0];
      const itemsToSave: DutyRosterItem[] = [];

      for (const emp of targetEmployees) {
        for (const day of weekDays) {
          const isWeekend = day.isWeekend;
          const shouldBeOff = isWeekend && !bulkIncludeWeekends;

          itemsToSave.push({
            id: `ros-${emp.id}-${day.dateStr}`,
            userId: emp.id,
            employeeId: emp.employeeId,
            employeeName: emp.name,
            shiftId: shouldBeOff ? '' : targetShift.id,
            shiftName: shouldBeOff ? 'Weekly Off' : targetShift.name,
            startTime: shouldBeOff ? '' : targetShift.startTime,
            endTime: shouldBeOff ? '' : targetShift.endTime,
            date: day.dateStr,
            isWeeklyOff: shouldBeOff,
            notes: shouldBeOff ? 'Scheduled Weekly Off' : 'Batch Allocated',
          });
        }
      }

      await ApiService.saveRosters(itemsToSave);
      await loadData();
      setShowBulkModal(false);
      showToast(`Successfully assigned duty roster to ${targetEmployees.length} staff members for the week!`);
    } catch (err) {
      console.warn('Bulk roster assignment error:', err);
      showToast('Failed to apply bulk roster changes.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter Employees
  const filteredEmployees = executives.filter(e => {
    if (selectedDeptId !== 'ALL' && e.departmentId !== selectedDeptId) {
      return false;
    }
    return true;
  });

  return (
    <div className={`space-y-4 ${is16to9Mode ? 'text-slate-100' : 'text-slate-800'}`}>
      {/* Toast */}
      {toastMessage && (
        <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md animate-in fade-in duration-150 ${
          toastMessage.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 shadow-xs ${
        is16to9Mode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base tracking-tight">Work Timings & Duty Roster</h3>
            <p className="text-xs opacity-70">
              Schedule employee shifts, manage weekly offs, and enforce attendance timings
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Week Navigation */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-inherit transition-colors"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={handleCurrentWeek}
              className="px-2.5 py-1 text-xs font-bold rounded-lg hover:bg-white dark:hover:bg-slate-700 text-inherit transition-colors"
            >
              This Week
            </button>

            <button
              onClick={handleNextWeek}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-inherit transition-colors"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Department Filter */}
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-inherit focus:outline-hidden"
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {/* Bulk Shift Allocation */}
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Bulk Assign Roster</span>
          </button>
        </div>
      </div>

      {/* Roster Matrix Table */}
      <div className={`rounded-2xl border overflow-hidden shadow-xs ${
        is16to9Mode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b font-bold tracking-wider uppercase text-[10px] ${
                is16to9Mode ? 'bg-slate-800/80 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <th className="py-3 px-4 min-w-[200px]">Staff Member</th>
                {weekDays.map(d => (
                  <th 
                    key={d.dateStr} 
                    className={`py-3 px-3 text-center min-w-[130px] border-l ${
                      d.isToday 
                        ? 'bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' 
                        : is16to9Mode ? 'border-slate-800' : 'border-slate-100'
                    }`}
                  >
                    <div className="font-extrabold">{d.dayName}</div>
                    <div className="text-[11px] font-mono opacity-80">{d.dayNum} {d.monthName}</div>
                    {d.isToday && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-blue-600 text-white text-[9px] font-bold">
                        TODAY
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Users className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <span>No employees found to display roster timetable.</span>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/30 transition-colors">
                    {/* Employee Profile */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{emp.name}</div>
                      <div className="text-[10px] font-mono text-blue-600 dark:text-blue-400">{emp.employeeId}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">
                        {emp.staffType === 'OFFICE_STAFF' ? 'Office Staff' : emp.staffType === 'FIELD_RUNNER' ? 'Runner' : 'Field Executive'}
                      </div>
                    </td>

                    {/* 7 Day Schedule Selectors */}
                    {weekDays.map(day => {
                      const rosterItem = getRosterForCell(emp.id, day.dateStr);
                      const currentShiftId = rosterItem 
                        ? (rosterItem.isWeeklyOff ? 'OFF' : rosterItem.shiftId)
                        : (day.isWeekend ? 'OFF' : (emp.shiftId || shifts[0]?.id || ''));

                      const activeShift = shifts.find(s => s.id === currentShiftId);
                      const isOff = currentShiftId === 'OFF';

                      return (
                        <td 
                          key={day.dateStr}
                          className={`py-2.5 px-2 text-center border-l transition-colors ${
                            day.isToday 
                              ? 'bg-blue-50/20 dark:bg-blue-950/10 border-blue-200 dark:border-blue-800' 
                              : is16to9Mode ? 'border-slate-800' : 'border-slate-100'
                          }`}
                        >
                          <select
                            value={currentShiftId}
                            onChange={(e) => handleCellShiftChange(emp, day.dateStr, e.target.value)}
                            className={`w-full py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer focus:outline-hidden ${
                              isOff 
                                ? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:border-slate-700' 
                                : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/80 font-semibold'
                            }`}
                          >
                            <option value="OFF">☕ Weekly Off</option>
                            {shifts.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.startTime}-{s.endTime})
                              </option>
                            ))}
                          </select>

                          <div className="mt-1 text-[10px] font-mono opacity-70">
                            {isOff ? (
                              <span className="text-slate-400">Rest Day</span>
                            ) : (
                              <span>{activeShift ? `${activeShift.startTime} - ${activeShift.endTime}` : '09:00 - 18:00'}</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Assignment Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Bulk Roster Schedule</h3>
                  <p className="text-[11px] opacity-70">Assign shift timetable to staff</p>
                </div>
              </div>
              <button 
                onClick={() => setShowBulkModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              {/* Select Staff */}
              <div>
                <label className="font-bold block mb-1">Target Staff</label>
                <select
                  value={bulkStaffSelection}
                  onChange={(e) => setBulkStaffSelection(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold focus:outline-hidden"
                >
                  <option value="ALL">All Staff Members ({executives.length})</option>
                  {executives.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>
                  ))}
                </select>
              </div>

              {/* Select Shift */}
              <div>
                <label className="font-bold block mb-1">Duty Shift</label>
                <select
                  value={bulkShiftId}
                  onChange={(e) => setBulkShiftId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold focus:outline-hidden"
                >
                  {shifts.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime} to {s.endTime} &bull; {s.fullDayHours || 8.5} hrs)
                    </option>
                  ))}
                </select>
              </div>

              {/* Weekend Toggle */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold block text-xs">Include Weekends (Sat &amp; Sun)</span>
                  <span className="text-[11px] opacity-70">If off, weekends are automatically set as Weekly Off</span>
                </div>
                <input 
                  type="checkbox"
                  checked={bulkIncludeWeekends}
                  onChange={(e) => setBulkIncludeWeekends(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 rounded-xl border border-blue-200 dark:border-blue-800 text-[11px] leading-relaxed">
                Applying will populate the 7 days of the current week (from <strong>{weekDays[0]?.dateStr}</strong> to <strong>{weekDays[6]?.dateStr}</strong>) with the selected timings.
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleApplyBulkRoster}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-xs"
              >
                {isSaving ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Apply Roster</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
