import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  UserPlus, 
  Building, 
  MapPin, 
  Briefcase, 
  Clock, 
  KeyRound, 
  Edit3, 
  AlertTriangle, 
  CheckCircle2, 
  Radio, 
  Coins,
  Calendar,
  Layers
} from 'lucide-react';
import { User, StaffType } from '../../types';
import { ApiService, AllMastersData } from '../../services/api';
import { useOrganization } from '../../context/OrganizationContext';
import { StaffRegistrationModal } from './StaffRegistrationModal';
import { PasswordResetModal } from '../common/PasswordResetModal';

interface EmployeeMasterViewProps {
  users?: User[];
  masters?: AllMastersData;
  onRefresh?: () => void;
  onOpenRegister?: () => void;
}

export const EmployeeMasterView: React.FC<EmployeeMasterViewProps> = ({
  users,
  masters,
  onRefresh,
  onOpenRegister,
}) => {
  const { formatCurrency } = useOrganization();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaffType, setSelectedStaffType] = useState<string>('ALL');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [resetTargetUser, setResetTargetUser] = useState<User | null>(null);

  // Internal state when not provided via props
  const [internalUsers, setInternalUsers] = useState<User[]>([]);
  const [internalMasters, setInternalMasters] = useState<AllMastersData>({
    companies: [],
    branches: [],
    departments: [],
    designations: [],
    shifts: [],
    roles: [],
  });

  const loadInternalData = async () => {
    try {
      if (!users || users.length === 0) {
        const uList = await ApiService.getUsers();
        if (Array.isArray(uList)) setInternalUsers(uList);
      }
    } catch (err) {
      console.warn('Failed to load users for master view:', err);
    }

    try {
      if (!masters || !masters.branches || masters.branches.length === 0) {
        const mData = await ApiService.getAllMasters();
        if (mData) setInternalMasters(mData);
      }
    } catch (err) {
      console.warn('Failed to load masters for master view:', err);
    }
  };

  useEffect(() => {
    loadInternalData();
  }, [users, masters]);

  const effectiveUsers = (users && users.length > 0) ? users : internalUsers;
  const effectiveMasters = (masters && masters.branches && masters.branches.length > 0) ? masters : internalMasters;

  // Filtered employees safely guarded
  const safeUsers = Array.isArray(effectiveUsers) ? effectiveUsers : [];
  const filteredUsers = safeUsers.filter((u) => {
    if (!u) return false;
    const name = (u.name || '').toLowerCase();
    const empId = (u.employeeId || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const addr = (u.residentialAddress || '').toLowerCase();
    const q = searchTerm.toLowerCase();

    const matchesSearch = 
      name.includes(q) ||
      empId.includes(q) ||
      email.includes(q) ||
      addr.includes(q);

    const matchesType = selectedStaffType === 'ALL' || u.staffType === selectedStaffType;
    const matchesBranch = selectedBranch === 'ALL' || u.branchId === selectedBranch;

    return matchesSearch && matchesType && matchesBranch;
  });

  const getStaffTypeBadge = (type?: StaffType) => {
    switch (type) {
      case 'OFFICE_STAFF':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
            <Building className="w-3 h-3" />
            Office Staff
          </span>
        );
      case 'FIELD_STAFF':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Field Staff
          </span>
        );
      case 'FIELD_RUNNER':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
            <Layers className="w-3 h-3" />
            Field Runner (Both)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            General Staff
          </span>
        );
    }
  };

  const getShiftLabel = (shiftId?: string) => {
    const s = (effectiveMasters?.shifts || []).find(item => item.id === shiftId);
    return s ? `${s.name} (${s.startTime} - ${s.endTime})` : 'General Shift (09:00 - 18:00)';
  };

  const getDepartmentLabel = (deptId?: string) => {
    const d = (effectiveMasters?.departments || []).find(item => item.id === deptId);
    return d ? d.name : 'Operations';
  };

  const getDesignationLabel = (desigId?: string) => {
    const d = (effectiveMasters?.designations || []).find(item => item.id === desigId);
    return d ? d.title : 'Field Officer';
  };

  const getBranchLabel = (branchId?: string) => {
    const b = (effectiveMasters?.branches || []).find(item => item.id === branchId);
    return b ? `${b.name} (${b.city || 'HQ'})` : 'Main HQ';
  };

  return (
    <div className="space-y-5">
      {/* Search & Actions Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search staff by name, ID, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-hidden bg-slate-50 focus:bg-white transition-colors"
            />
          </div>

          {/* Staff Type Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedStaffType}
              onChange={(e) => setSelectedStaffType(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
            >
              <option value="ALL">All Staff Types</option>
              <option value="OFFICE_STAFF">Office Staff</option>
              <option value="FIELD_STAFF">Field Staff</option>
              <option value="FIELD_RUNNER">Field Runner (Both)</option>
            </select>

            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full sm:w-44 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
            >
              <option value="ALL">All Branches</option>
              {(effectiveMasters?.branches || []).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Register Staff Button */}
        <button
          onClick={() => {
            if (onOpenRegister) {
              onOpenRegister();
            } else {
              setEditingStaff(null);
              setIsRegisterModalOpen(true);
            }
          }}
          className="w-full md:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Register New Staff
        </button>
      </div>

      {/* Staff Count Pill */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-medium">
        <span>Showing <strong>{filteredUsers.length}</strong> registered staff members</span>
        <span>Includes Office Staff, Field Executives & Field Runners</span>
      </div>

      {/* Staff Master Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group"
          >
            <div>
              {/* Header Info with Photo */}
              <div className="flex items-start gap-3.5 mb-3">
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-xs">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-blue-600 text-white font-black flex items-center justify-center text-base">
                      {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                  )}

                  {/* GPS Duty Status Indicator */}
                  <span
                    title={user.dutyGpsStatus === 'GPS_DISABLED_ABSENT' ? 'GPS DISABLED: Marked ABSENT' : 'GPS Active'}
                    className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                      user.dutyGpsStatus === 'GPS_DISABLED_ABSENT'
                        ? 'bg-rose-500 status-pulse'
                        : user.currentStatus === 'CHECKED_IN'
                        ? 'bg-green-500 status-pulse'
                        : 'bg-slate-400'
                    }`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-bold text-slate-900 text-sm truncate">{user.name}</h4>
                    <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded shrink-0">
                      {user.employeeId}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                    {getDesignationLabel(user.designationId)} &bull; {getDepartmentLabel(user.departmentId)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {getStaffTypeBadge(user.staffType)}
                  </div>
                </div>
              </div>

              {/* GPS Duty Alert Banner if GPS was disabled */}
              {user.dutyGpsStatus === 'GPS_DISABLED_ABSENT' && (
                <div className="mb-3 p-2 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-[11px] font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>GPS Disabled: Marked ABSENT from duty</span>
                </div>
              )}

              {/* Metadata Details */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5 text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5" /> Branch:
                  </span>
                  <span className="font-medium text-slate-800">{getBranchLabel(user.branchId)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Shift:
                  </span>
                  <span className="font-medium text-slate-800">{getShiftLabel(user.shiftId)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-slate-400" /> Base Pay:
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(user.salarySetup?.baseSalaryMonthly || 3500)}/mo
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Leaves Balance:
                  </span>
                  <span className="font-medium text-slate-800">
                    CL: {user.leavesEntitlement?.casual || 12} &bull; SL: {user.leavesEntitlement?.sick || 8} &bull; EL: {user.leavesEntitlement?.earned || 15}
                  </span>
                </div>
                {user.residentialAddress && (
                  <div className="pt-1 text-[11px] text-slate-500 border-t border-slate-200 truncate">
                    📍 {user.residentialAddress}
                  </div>
                )}
              </div>
            </div>

            {/* Actions Toolbar */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500 font-mono">
                {user.mobile}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setResetTargetUser(user)}
                  title="Reset Staff Login Password"
                  className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center gap-1 font-semibold transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                  Reset Password
                </button>
                <button
                  onClick={() => {
                    setEditingStaff(user);
                    setIsRegisterModalOpen(true);
                  }}
                  title="Edit Staff Member"
                  className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 flex items-center gap-1 font-semibold transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Staff Registration / Edit Modal */}
      <StaffRegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => {
          setIsRegisterModalOpen(false);
          setEditingStaff(null);
        }}
        onSuccess={() => {
          if (onRefresh) {
            onRefresh();
          } else {
            loadInternalData();
          }
        }}
        existingStaff={editingStaff}
        masters={effectiveMasters}
      />

      {/* Password Reset Modal */}
      <PasswordResetModal
        isOpen={!!resetTargetUser}
        onClose={() => setResetTargetUser(null)}
        targetUser={resetTargetUser}
        isAdminReset={true}
      />
    </div>
  );
};
