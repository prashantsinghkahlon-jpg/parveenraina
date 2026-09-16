import React, { useState, useEffect } from 'react';
import { 
  Banknote, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  TrendingDown, 
  TrendingUp, 
  ShieldAlert, 
  Info,
  Layers,
  Printer,
  ChevronRight,
  UserCheck,
  Percent
} from 'lucide-react';
import { User, SalaryCalculation, WorkSession } from '../../types';
import { ApiService } from '../../services/api';
import { useOrganization } from '../../context/OrganizationContext';

interface StaffSalaryAttendanceViewProps {
  currentUser: User;
}

export const StaffSalaryAttendanceView: React.FC<StaffSalaryAttendanceViewProps> = ({
  currentUser,
}) => {
  const { currencySymbol, currencyCode, formatCurrency, company } = useOrganization();
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [salaryData, setSalaryData] = useState<SalaryCalculation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSlipModal, setShowSlipModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadSalaryDetails = async () => {
      setIsLoading(true);
      try {
        const res = await ApiService.calculateSalaries(selectedMonth, undefined, currentUser.id);
        if (isMounted) {
          const staffCalc = res.calculations?.find(c => c.userId === currentUser.id) || res.calculations?.[0] || null;
          setSalaryData(staffCalc);
        }
      } catch (err) {
        console.warn('Failed to fetch salary details:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadSalaryDetails();
    return () => {
      isMounted = false;
    };
  }, [selectedMonth, currentUser.id]);

  // Derived / fallback values if server returned default
  const baseSalary = salaryData?.baseSalary || currentUser.salarySetup?.baseSalaryMonthly || 3500;
  const totalWorkingDays = salaryData?.totalWorkingDays || 26;
  const presentDays = salaryData?.presentDays ?? 24;
  const halfDays = salaryData?.halfDays ?? 0;
  const absentDays = salaryData?.absentDays ?? 1;
  const approvedPaidLeaves = salaryData?.approvedPaidLeaves ?? 1;
  const gpsDisabledHours = salaryData?.gpsDisabledHours ?? (currentUser.dutyGpsStatus === 'GPS_DISABLED_ABSENT' ? 8.5 : 0);
  
  const earnedBase = salaryData?.earnedBaseSalary || Math.round((baseSalary / totalWorkingDays) * (presentDays + (halfDays * 0.5) + approvedPaidLeaves));
  const travelAllowance = salaryData?.travelAllowance ?? (currentUser.salarySetup?.travelAllowance || 300);
  const specialAllowance = salaryData?.specialAllowance ?? (currentUser.salarySetup?.specialAllowance || 150);
  const overtimeHours = salaryData?.overtimeHours ?? 0;
  const overtimeRate = currentUser.salarySetup?.overtimeHourlyRate || 25;
  const overtimePayout = overtimeHours * overtimeRate;
  const totalAllowances = travelAllowance + specialAllowance + overtimePayout;

  const penaltyRatePerHour = currentUser.salarySetup?.gpsAbsencePenaltyPerHour || 25;
  const gpsPenaltyDeduction = salaryData?.gpsAbsenceDeductions ?? Math.round(gpsDisabledHours * penaltyRatePerHour);
  const absentLoss = Math.round((baseSalary / totalWorkingDays) * absentDays);
  const statutoryDeductions = salaryData?.statutoryDeductions ?? (currentUser.salarySetup?.providentFundDeduction || 120);
  const taxDeduction = salaryData?.taxDeduction ?? (currentUser.salarySetup?.taxDeduction || 180);
  const totalDeductions = absentLoss + gpsPenaltyDeduction + statutoryDeductions + taxDeduction;

  const netPayable = salaryData?.netPayableSalary || Math.max(0, earnedBase + totalAllowances - (gpsPenaltyDeduction + statutoryDeductions + taxDeduction));

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Header & Month Picker */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Attendance & Salary Overview</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent breakdown of attendance period, duty hours, allowances, and absence fines.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-600">Payroll Month:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-hidden"
          />
        </div>
      </div>

      {/* Mandatory Duty Sensor & Attendance Alert */}
      <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 transition-colors ${
        currentUser.dutyGpsStatus === 'GPS_DISABLED_ABSENT'
          ? 'bg-rose-50 border-rose-200 text-rose-900'
          : 'bg-emerald-50 border-emerald-200 text-emerald-900'
      }`}>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
          currentUser.dutyGpsStatus === 'GPS_DISABLED_ABSENT'
            ? 'bg-rose-600 text-white'
            : 'bg-emerald-600 text-white'
        }`}>
          {currentUser.dutyGpsStatus === 'GPS_DISABLED_ABSENT' ? (
            <ShieldAlert className="w-4 h-4" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
        </div>
        <div className="space-y-1">
          <div className="font-bold flex items-center gap-2">
            <span>
              Duty GPS Status: {currentUser.dutyGpsStatus === 'GPS_DISABLED_ABSENT' ? 'GPS Sensor Disabled (Marked Absent)' : 'GPS Sensor Active (Duty Verified)'}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed opacity-90">
            {currentUser.dutyGpsStatus === 'GPS_DISABLED_ABSENT'
              ? `Warning: Staff policy requires continuous GPS telemetry during active shift. GPS disabled hours incur an automated deduction penalty of ${formatCurrency(penaltyRatePerHour)}/hr.`
              : 'Your GPS sensor is active. Verified check-in hours and geofence pings are logged seamlessly toward full-day attendance credit.'}
          </p>
        </div>
      </div>

      {/* Net Payable Hero Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[11px] font-bold tracking-wider uppercase text-blue-200 border border-white/10">
                {selectedMonth} Earnings Slip
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                salaryData?.paymentStatus === 'PAID'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                {salaryData?.paymentStatus || 'APPROVED'}
              </span>
            </div>
            <div className="text-xs text-slate-400 font-medium">
              Estimated Net Take-Home Salary
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white flex items-baseline gap-1">
              <span>{formatCurrency(netPayable)}</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Gross Monthly Base: {formatCurrency(baseSalary)} &bull; Total Additions: +{formatCurrency(totalAllowances)} &bull; Deductions &amp; Fines: -{formatCurrency(totalDeductions)}
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
            <button
              onClick={() => setShowSlipModal(true)}
              className="px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>View Full Payslip</span>
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Period Summary Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Attendance Period Record ({selectedMonth})
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500">
            Total Cycle: {totalWorkingDays} Working Days
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
            <span className="text-[11px] font-semibold text-emerald-800">Present Full Days</span>
            <div className="text-xl font-mono font-bold text-emerald-900">{presentDays} Days</div>
            <span className="text-[10px] text-emerald-700">100% duty credit</span>
          </div>

          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
            <span className="text-[11px] font-semibold text-blue-800">Approved Paid Leaves</span>
            <div className="text-xl font-mono font-bold text-blue-900">{approvedPaidLeaves} Day{approvedPaidLeaves > 1 ? 's' : ''}</div>
            <span className="text-[10px] text-blue-700">Covered under leave balance</span>
          </div>

          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
            <span className="text-[11px] font-semibold text-amber-800">Half Days</span>
            <div className="text-xl font-mono font-bold text-amber-900">{halfDays} Day{halfDays > 1 ? 's' : ''}</div>
            <span className="text-[10px] text-amber-700">50% shift credit</span>
          </div>

          <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-1">
            <span className="text-[11px] font-semibold text-rose-800">Unapproved Absences</span>
            <div className="text-xl font-mono font-bold text-rose-900">{absentDays} Day{absentDays > 1 ? 's' : ''}</div>
            <span className="text-[10px] text-rose-700">Subject to daily rate deduction</span>
          </div>
        </div>
      </div>

      {/* Two Column Detailed Breakdown: Allowances vs Deductions & Fines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Allowances & Earnings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Earnings &amp; Allowances
              </h4>
            </div>
            <span className="text-xs font-bold text-emerald-600 font-mono">
              +{formatCurrency(earnedBase + totalAllowances)}
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">Earned Base Salary</p>
                <p className="text-[11px] text-slate-500">
                  {presentDays + approvedPaidLeaves} full days credit @ {formatCurrency(baseSalary / totalWorkingDays, { decimals: 2 })}/day
                </p>
              </div>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(earnedBase)}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">Travel &amp; Fuel Allowance</p>
                <p className="text-[11px] text-slate-500">Field transit mileage &amp; commute reimbursement</p>
              </div>
              <span className="font-mono font-bold text-slate-900">
                +{formatCurrency(travelAllowance)}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">Special Duty Allowance</p>
                <p className="text-[11px] text-slate-500">High-priority client route bonus</p>
              </div>
              <span className="font-mono font-bold text-slate-900">
                +{formatCurrency(specialAllowance)}
              </span>
            </div>

            {overtimeHours > 0 && (
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">Overtime Hours Payout</p>
                  <p className="text-[11px] text-slate-500">
                    {overtimeHours} hours logged @ {formatCurrency(overtimeRate)}/hour
                  </p>
                </div>
                <span className="font-mono font-bold text-emerald-600">
                  +{formatCurrency(overtimePayout)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Deductions, Penalties & Fines */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Deductions, Penalties &amp; Fines
              </h4>
            </div>
            <span className="text-xs font-bold text-rose-600 font-mono">
              -{formatCurrency(totalDeductions)}
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {absentDays > 0 && (
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-rose-900">Absent Days Loss</p>
                  <p className="text-[11px] text-rose-700">
                    {absentDays} unapproved days missed from cycle
                  </p>
                </div>
                <span className="font-mono font-bold text-rose-600">
                  -{formatCurrency(absentLoss)}
                </span>
              </div>
            )}

            <div className="py-2.5 flex items-center justify-between bg-amber-50/60 px-2 -mx-2 rounded-lg">
              <div>
                <div className="flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <p className="font-bold text-amber-900">GPS Absent Penalty / Fine</p>
                </div>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  {gpsDisabledHours} hrs GPS inactive during duty @ {formatCurrency(penaltyRatePerHour)}/hr
                </p>
              </div>
              <span className="font-mono font-bold text-amber-700">
                -{formatCurrency(gpsPenaltyDeduction)}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">Statutory Deductions (PF / Insurance)</p>
                <p className="text-[11px] text-slate-500">Provident fund &amp; medical protection policy</p>
              </div>
              <span className="font-mono font-bold text-slate-900">
                -{formatCurrency(statutoryDeductions)}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">Income Tax (Withheld)</p>
                <p className="text-[11px] text-slate-500">Standard federal / state payroll tax deduction</p>
              </div>
              <span className="font-mono font-bold text-slate-900">
                -{formatCurrency(taxDeduction)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Payslip Modal */}
      {showSlipModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  SLIP
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{company.name || 'Apex Global Logistics'} - Salary Slip</h3>
                  <p className="text-[11px] text-slate-500">Period: {selectedMonth} &bull; Currency: {currencyCode}</p>
                </div>
              </div>
              <button
                onClick={() => setShowSlipModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                &times;
              </button>
            </div>

            {/* Employee Meta */}
            <div className="grid grid-cols-2 gap-3 text-xs p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Staff Member</span>
                <p className="font-bold text-slate-800">{currentUser.name}</p>
                <p className="text-[11px] text-slate-500 font-mono">ID: {currentUser.employeeId}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Designation / Role</span>
                <p className="font-bold text-slate-800">{currentUser.staffType || 'Field Executive'}</p>
                <p className="text-[11px] text-slate-500">Cycle: {totalWorkingDays} Working Days</p>
              </div>
            </div>

            {/* Detailed Payslip Table */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Itemized Summary
              </div>
              <div className="space-y-1.5 border border-slate-200 rounded-2xl p-3 divide-y divide-slate-100">
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Base Salary Contract</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(baseSalary)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Attended Days Earned ({presentDays + approvedPaidLeaves}/{totalWorkingDays})</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(earnedBase)}</span>
                </div>
                <div className="flex justify-between py-1 text-emerald-700 font-medium">
                  <span>Total Allowances (Travel + Special + OT)</span>
                  <span className="font-mono font-bold">+{formatCurrency(totalAllowances)}</span>
                </div>
                <div className="flex justify-between py-1 text-rose-700 font-medium">
                  <span>Absence &amp; Unapproved Leaves Loss</span>
                  <span className="font-mono font-bold">-{formatCurrency(absentLoss)}</span>
                </div>
                <div className="flex justify-between py-1 text-amber-700 font-medium">
                  <span>GPS Sensor Inactivity Penalty / Fine</span>
                  <span className="font-mono font-bold">-{formatCurrency(gpsPenaltyDeduction)}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-600">
                  <span>PF, Insurance &amp; Statutory Withholdings</span>
                  <span className="font-mono font-bold">-{formatCurrency(statutoryDeductions)}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-600">
                  <span>Income Tax Deduction</span>
                  <span className="font-mono font-bold">-{formatCurrency(taxDeduction)}</span>
                </div>
              </div>
            </div>

            {/* Total Net */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Net Amount Credited</span>
                <p className="text-[11px] text-emerald-700">Direct Deposit / Bank Transfer</p>
              </div>
              <div className="text-2xl font-black font-mono text-emerald-900">
                {formatCurrency(netPayable)}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Payslip</span>
              </button>
              <button
                onClick={() => setShowSlipModal(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
