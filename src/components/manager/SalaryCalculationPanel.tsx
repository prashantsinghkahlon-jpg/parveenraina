import React, { useState, useEffect } from 'react';
import { 
  Banknote, 
  Calendar, 
  Download, 
  Printer, 
  AlertTriangle, 
  CheckCircle2, 
  Building, 
  Users, 
  FileText, 
  CreditCard,
  Percent,
  Search,
  ArrowDownRight,
  TrendingDown,
  X
} from 'lucide-react';
import { SalaryCalculation, User } from '../../types';
import { ApiService, AllMastersData } from '../../services/api';
import { useOrganization } from '../../context/OrganizationContext';

interface SalaryCalculationPanelProps {
  masters?: AllMastersData;
  users?: User[];
}

export const SalaryCalculationPanel: React.FC<SalaryCalculationPanelProps> = ({
  masters,
  users,
}) => {
  const { currencySymbol, currencyCode, formatCurrency, company } = useOrganization();
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [calculations, setCalculations] = useState<SalaryCalculation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<SalaryCalculation | null>(null);

  // Internal masters if not provided
  const [internalMasters, setInternalMasters] = useState<AllMastersData | null>(null);

  useEffect(() => {
    if (!masters) {
      ApiService.getAllMasters()
        .then(data => {
          if (data) setInternalMasters(data);
        })
        .catch(err => console.warn('Failed to load masters for salary:', err));
    }
  }, [masters]);

  const effectiveMasters = masters || internalMasters;

  const fetchSalaries = async () => {
    setIsLoading(true);
    try {
      const data = await ApiService.calculateSalaries(
        selectedMonth, 
        selectedBranch === 'ALL' ? undefined : selectedBranch
      );
      setCalculations(Array.isArray(data?.calculations) ? data.calculations : []);
    } catch (err) {
      console.error('Failed to compute salary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaries();
  }, [selectedMonth, selectedBranch]);

  // Search filtered calculations safely guarded
  const safeCalculations = Array.isArray(calculations) ? calculations : [];
  const filteredCalculations = safeCalculations.filter((calc) => {
    if (!calc) return false;
    const name = (calc.employeeName || '').toLowerCase();
    const empId = (calc.employeeId || '').toLowerCase();
    const desig = (calc.designationTitle || '').toLowerCase();
    const q = searchTerm.toLowerCase();
    return name.includes(q) || empId.includes(q) || desig.includes(q);
  });

  const totalPayroll = filteredCalculations.reduce((sum, c) => sum + c.netPayableSalary, 0);
  const totalGpsDeductions = filteredCalculations.reduce((sum, c) => sum + c.gpsAbsenceDeductions, 0);
  const totalPresentDays = filteredCalculations.reduce((sum, c) => sum + c.presentDays, 0);
  const totalApprovedLeaves = filteredCalculations.reduce((sum, c) => sum + c.approvedPaidLeaves, 0);

  // CSV Export handler
  const handleExportCSV = () => {
    const headers = [
      'Employee ID',
      'Name',
      'Staff Type',
      'Designation',
      'Month',
      'Working Days',
      'Present Days',
      'Half Days',
      'Absent Days',
      'Paid Leaves',
      'GPS Disabled (hrs)',
      `Base Salary (${currencyCode})`,
      `Earned Base (${currencyCode})`,
      `Allowances (${currencyCode})`,
      `GPS Penalty (${currencyCode})`,
      `Statutory Deductions (${currencyCode})`,
      `Net Payable (${currencyCode})`
    ];

    const rows = filteredCalculations.map(c => [
      c.employeeId,
      `"${c.employeeName}"`,
      c.staffType,
      `"${c.designationTitle}"`,
      c.month,
      c.totalWorkingDays,
      c.presentDays,
      c.halfDays,
      c.absentDays,
      c.approvedPaidLeaves,
      c.gpsDisabledHours,
      c.baseSalary,
      c.earnedBaseSalary,
      c.totalAllowances,
      c.gpsAbsenceDeductions,
      c.statutoryDeductions,
      c.netPayableSalary
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Salary_Sheet_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Metrics */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Month Picker */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Month:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden font-mono"
            />
          </div>

          {/* Branch Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Branch:</label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
            >
              <option value="ALL">All Branches</option>
              {(effectiveMasters?.branches || []).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>
        </div>

        {/* Export & Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export Payroll CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Net Payroll</span>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {formatCurrency(totalPayroll)}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">For {filteredCalculations.length} staff members</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Duty Present</span>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
            {totalPresentDays} <span className="text-sm font-normal text-slate-500">days</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">Full attended shifts</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Approved Paid Leaves</span>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-blue-600 font-mono">
            {totalApprovedLeaves} <span className="text-sm font-normal text-slate-500">days</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">Credited to salary</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">GPS Absence Penalty</span>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-rose-600 font-mono">
            -{formatCurrency(totalGpsDeductions)}
          </div>
          <p className="mt-1 text-[11px] text-rose-600 font-medium">Deducted for GPS disabled hours</p>
        </div>
      </div>

      {/* Salary Calculations Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Banknote className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Attendance-Based Salary Register &amp; Payroll</h3>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500">{selectedMonth}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Working Days</th>
                <th className="py-3 px-3 text-center">P / HD / A</th>
                <th className="py-3 px-3 text-center">Paid Leaves</th>
                <th className="py-3 px-3 text-center text-rose-700">GPS Absent (hrs)</th>
                <th className="py-3 px-3">Base Pay</th>
                <th className="py-3 px-3">Earned Base</th>
                <th className="py-3 px-3">Allowances</th>
                <th className="py-3 px-3 text-rose-700">Deductions</th>
                <th className="py-3 px-4 font-black text-slate-900">Net Payable</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
              {filteredCalculations.map((calc) => (
                <tr key={calc.userId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{calc.employeeName}</div>
                    <div className="text-[11px] font-mono text-slate-500">{calc.employeeId} &bull; {calc.designationTitle}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                      {calc.staffType === 'OFFICE_STAFF' ? 'Office' : calc.staffType === 'FIELD_STAFF' ? 'Field' : 'Runner'}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono">{calc.totalWorkingDays}</td>
                  <td className="py-3 px-3 text-center font-mono">
                    <span className="text-emerald-700 font-bold">{calc.presentDays}</span> / 
                    <span className="text-amber-700 font-bold"> {calc.halfDays}</span> / 
                    <span className="text-rose-700 font-bold"> {calc.absentDays}</span>
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-blue-700 font-bold">
                    {calc.approvedPaidLeaves}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-rose-700 font-bold">
                    {calc.gpsDisabledHours > 0 ? `${calc.gpsDisabledHours}h (-${formatCurrency(calc.gpsAbsenceDeductions)})` : '0h'}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500">{formatCurrency(calc.baseSalary)}</td>
                  <td className="py-3 px-3 font-mono font-semibold text-slate-900">{formatCurrency(calc.earnedBaseSalary)}</td>
                  <td className="py-3 px-3 font-mono text-emerald-700">+{formatCurrency(calc.totalAllowances)}</td>
                  <td className="py-3 px-3 font-mono text-rose-700">-{formatCurrency(calc.statutoryDeductions + calc.gpsAbsenceDeductions)}</td>
                  <td className="py-3 px-4 font-mono font-black text-slate-900 text-sm">
                    {formatCurrency(calc.netPayableSalary)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => setSelectedSlip(calc)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Pay Slip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pay Slip Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setSelectedSlip(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors print:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Slip Content */}
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    {company.name || 'Apex Global Logistics & Enterprise'}
                  </h3>
                  <p className="text-xs text-slate-500">Official Monthly Salary Slip &amp; Attendance Record</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-1 rounded">
                    {selectedSlip.month}
                  </span>
                </div>
              </div>

              {/* Employee Summary */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div><strong>Employee:</strong> {selectedSlip.employeeName}</div>
                <div><strong>Employee ID:</strong> <span className="font-mono">{selectedSlip.employeeId}</span></div>
                <div><strong>Designation:</strong> {selectedSlip.designationTitle}</div>
                <div><strong>Staff Type:</strong> {selectedSlip.staffType}</div>
              </div>

              {/* Attendance Breakdown */}
              <div className="text-xs space-y-1 bg-white p-3 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Attendance Metrics
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>Working Days:</span>
                    <strong className="font-mono">{selectedSlip.totalWorkingDays}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Present Days:</span>
                    <strong className="font-mono text-emerald-700">{selectedSlip.presentDays}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Half Days:</span>
                    <strong className="font-mono text-amber-700">{selectedSlip.halfDays}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Paid Leaves:</span>
                    <strong className="font-mono text-blue-700">{selectedSlip.approvedPaidLeaves}</strong>
                  </div>
                  <div className="flex justify-between col-span-2 text-rose-700">
                    <span>GPS Disabled Absence Penalty:</span>
                    <strong className="font-mono">{selectedSlip.gpsDisabledHours} hrs (-{formatCurrency(selectedSlip.gpsAbsenceDeductions)})</strong>
                  </div>
                </div>
              </div>

              {/* Earnings & Deductions Table */}
              <div className="text-xs border border-slate-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-2 bg-slate-50 p-2 font-bold text-slate-700 border-b border-slate-200">
                  <span>Earnings ({currencyCode})</span>
                  <span>Deductions ({currencyCode})</span>
                </div>
                <div className="grid grid-cols-2 p-3 gap-4">
                  <div className="space-y-1 text-slate-600">
                    <div className="flex justify-between">
                      <span>Base Salary Earned:</span>
                      <strong className="font-mono text-slate-900">{formatCurrency(selectedSlip.earnedBaseSalary)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Travel Allowance:</span>
                      <strong className="font-mono text-slate-900">{formatCurrency(selectedSlip.travelAllowance)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Special Allowance:</span>
                      <strong className="font-mono text-slate-900">{formatCurrency(selectedSlip.specialAllowance)}</strong>
                    </div>
                  </div>

                  <div className="space-y-1 text-slate-600">
                    <div className="flex justify-between text-rose-700">
                      <span>GPS Penalty:</span>
                      <strong className="font-mono">-{formatCurrency(selectedSlip.gpsAbsenceDeductions)}</strong>
                    </div>
                    <div className="flex justify-between text-rose-700">
                      <span>Statutory Deductions:</span>
                      <strong className="font-mono">-{formatCurrency(selectedSlip.statutoryDeductions)}</strong>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-900 text-white p-3 flex justify-between items-center font-bold">
                  <span>NET PAYABLE SALARY:</span>
                  <span className="font-mono text-base font-black text-emerald-400">
                    {formatCurrency(selectedSlip.netPayableSalary, { showCode: true })}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  Print Pay Slip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
