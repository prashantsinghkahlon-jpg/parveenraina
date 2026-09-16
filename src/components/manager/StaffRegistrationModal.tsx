import React, { useState, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Camera, 
  User, 
  Briefcase, 
  Clock, 
  MapPin, 
  Banknote, 
  Shield, 
  CheckCircle2, 
  Calendar,
  AlertCircle,
  Building,
  Layers,
  Plus
} from 'lucide-react';
import { 
  User as UserType, 
  StaffType, 
  Gender, 
  CompanyMaster, 
  BranchMaster, 
  DepartmentMaster, 
  DesignationMaster, 
  ShiftMaster, 
  SystemRole,
  TaskAssignment
} from '../../types';
import { ApiService } from '../../services/api';
import { useOrganization } from '../../context/OrganizationContext';

interface StaffRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newUser: UserType) => void;
  existingStaff?: UserType | null;
  masters?: {
    companies: CompanyMaster[];
    branches: BranchMaster[];
    departments: DepartmentMaster[];
    designations: DesignationMaster[];
    shifts: ShiftMaster[];
    roles: SystemRole[];
  };
}

export const StaffRegistrationModal: React.FC<StaffRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingStaff,
  masters: propMasters,
}) => {
  const [internalMasters, setInternalMasters] = useState<{
    companies: CompanyMaster[];
    branches: BranchMaster[];
    departments: DepartmentMaster[];
    designations: DesignationMaster[];
    shifts: ShiftMaster[];
    roles: SystemRole[];
  }>({
    companies: [],
    branches: [],
    departments: [],
    designations: [],
    shifts: [],
    roles: [],
  });

  React.useEffect(() => {
    if (!propMasters) {
      ApiService.getAllMasters().then(data => {
        if (data) setInternalMasters(data);
      }).catch(err => console.warn('Failed to load masters in StaffRegistrationModal:', err));
    }
  }, [propMasters]);

  const { currencySymbol } = useOrganization();
  const masters = propMasters || internalMasters;
  const [activeTab, setActiveTab] = useState<'personal' | 'job_shift' | 'salary_leaves' | 'tasks'>('personal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [photoPreview, setPhotoPreview] = useState<string>(existingStaff?.avatarUrl || '');
  const [name, setName] = useState(existingStaff?.name || '');
  const [employeeId, setEmployeeId] = useState(existingStaff?.employeeId || `EMP-${Math.floor(100 + Math.random() * 900)}`);
  const [email, setEmail] = useState(existingStaff?.email || '');
  const [mobile, setMobile] = useState(existingStaff?.mobile || '');
  const [gender, setGender] = useState<Gender>(existingStaff?.gender || 'MALE');
  const [staffType, setStaffType] = useState<StaffType>(existingStaff?.staffType || 'FIELD_STAFF');
  const [residentialAddress, setResidentialAddress] = useState(existingStaff?.residentialAddress || '');
  const [password, setPassword] = useState(existingStaff?.password || 'Staff@123');

  // Safe masters arrays
  const safeCompanies = Array.isArray(masters?.companies) ? masters.companies : [];
  const safeBranches = Array.isArray(masters?.branches) ? masters.branches : [];
  const safeDepartments = Array.isArray(masters?.departments) ? masters.departments : [];
  const safeDesignations = Array.isArray(masters?.designations) ? masters.designations : [];
  const safeShifts = Array.isArray(masters?.shifts) ? masters.shifts : [];
  const safeRoles = Array.isArray(masters?.roles) ? masters.roles : [];

  // Master links
  const [companyId, setCompanyId] = useState(existingStaff?.companyId || safeCompanies[0]?.id || '');
  const [branchId, setBranchId] = useState(existingStaff?.branchId || safeBranches[0]?.id || '');
  const [departmentId, setDepartmentId] = useState(existingStaff?.departmentId || safeDepartments[0]?.id || '');
  const [designationId, setDesignationId] = useState(existingStaff?.designationId || safeDesignations[0]?.id || '');
  const [shiftId, setShiftId] = useState(existingStaff?.shiftId || safeShifts[0]?.id || '');
  const [systemRoleId, setSystemRoleId] = useState(existingStaff?.systemRoleId || safeRoles[0]?.id || '');

  // Salary Setup
  const [baseSalary, setBaseSalary] = useState<number>(existingStaff?.salarySetup?.baseSalaryMonthly || 3500);
  const [dailyRate, setDailyRate] = useState<number>(existingStaff?.salarySetup?.dailyRate || 140);
  const [hourlyRate, setHourlyRate] = useState<number>(existingStaff?.salarySetup?.hourlyRate || 18);
  const [travelAllowance, setTravelAllowance] = useState<number>(existingStaff?.salarySetup?.travelAllowance || 400);
  const [specialAllowance, setSpecialAllowance] = useState<number>(existingStaff?.salarySetup?.specialAllowance || 200);
  const [taxDeduction, setTaxDeduction] = useState<number>(existingStaff?.salarySetup?.taxDeduction || 250);
  const [pfDeduction, setPfDeduction] = useState<number>(existingStaff?.salarySetup?.providentFundDeduction || 150);
  const [gpsPenaltyRate, setGpsPenaltyRate] = useState<number>(existingStaff?.salarySetup?.gpsAbsencePenaltyPerHour || 25);

  // Leaves
  const [casualLeaves, setCasualLeaves] = useState<number>(existingStaff?.leavesEntitlement?.casual || 12);
  const [sickLeaves, setSickLeaves] = useState<number>(existingStaff?.leavesEntitlement?.sick || 8);
  const [earnedLeaves, setEarnedLeaves] = useState<number>(existingStaff?.leavesEntitlement?.earned || 15);

  // Task allocation
  const [initialTaskTitle, setInitialTaskTitle] = useState('');
  const [initialTaskDesc, setInitialTaskDesc] = useState('');
  const [initialTaskPriority, setInitialTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [initialTaskDueDate, setInitialTaskDueDate] = useState('');

  // Synchronize and pre-populate old submitted details when editing staff or opening modal
  useEffect(() => {
    if (isOpen) {
      if (existingStaff) {
        setPhotoPreview(existingStaff.avatarUrl || '');
        setName(existingStaff.name || '');
        setEmployeeId(existingStaff.employeeId || '');
        setEmail(existingStaff.email || '');
        setMobile(existingStaff.mobile || '');
        setGender(existingStaff.gender || 'MALE');
        setStaffType(existingStaff.staffType || 'FIELD_STAFF');
        setResidentialAddress(existingStaff.residentialAddress || '');
        setPassword(existingStaff.password || '');
        setCompanyId(existingStaff.companyId || safeCompanies[0]?.id || '');
        setBranchId(existingStaff.branchId || safeBranches[0]?.id || '');
        setDepartmentId(existingStaff.departmentId || safeDepartments[0]?.id || '');
        setDesignationId(existingStaff.designationId || safeDesignations[0]?.id || '');
        setShiftId(existingStaff.shiftId || safeShifts[0]?.id || '');
        setSystemRoleId(existingStaff.systemRoleId || safeRoles[0]?.id || '');
        setBaseSalary(existingStaff.salarySetup?.baseSalaryMonthly ?? 3500);
        setDailyRate(existingStaff.salarySetup?.dailyRate ?? 140);
        setHourlyRate(existingStaff.salarySetup?.hourlyRate ?? 18);
        setTravelAllowance(existingStaff.salarySetup?.travelAllowance ?? 400);
        setSpecialAllowance(existingStaff.salarySetup?.specialAllowance ?? 200);
        setTaxDeduction(existingStaff.salarySetup?.taxDeduction ?? 250);
        setPfDeduction(existingStaff.salarySetup?.providentFundDeduction ?? 150);
        setGpsPenaltyRate(existingStaff.salarySetup?.gpsAbsencePenaltyPerHour ?? 25);
        setCasualLeaves(existingStaff.leavesEntitlement?.casual ?? 12);
        setSickLeaves(existingStaff.leavesEntitlement?.sick ?? 8);
        setEarnedLeaves(existingStaff.leavesEntitlement?.earned ?? 15);
      } else {
        setPhotoPreview('');
        setName('');
        setEmployeeId(`EMP-${Math.floor(100 + Math.random() * 900)}`);
        setEmail('');
        setMobile('');
        setGender('MALE');
        setStaffType('FIELD_STAFF');
        setResidentialAddress('');
        setPassword('Staff@123');
        setCompanyId(safeCompanies[0]?.id || '');
        setBranchId(safeBranches[0]?.id || '');
        setDepartmentId(safeDepartments[0]?.id || '');
        setDesignationId(safeDesignations[0]?.id || '');
        setShiftId(safeShifts[0]?.id || '');
        setSystemRoleId(safeRoles[0]?.id || '');
        setBaseSalary(3500);
        setDailyRate(140);
        setHourlyRate(18);
        setTravelAllowance(400);
        setSpecialAllowance(200);
        setTaxDeduction(250);
        setPfDeduction(150);
        setGpsPenaltyRate(25);
        setCasualLeaves(12);
        setSickLeaves(8);
        setEarnedLeaves(15);
      }
      setInitialTaskTitle('');
      setInitialTaskDesc('');
      setInitialTaskPriority('MEDIUM');
      setInitialTaskDueDate('');
      setActiveTab('personal');
      setError(null);
    }
  }, [isOpen, existingStaff]);

  if (!isOpen) return null;

  // Handle Photo Upload
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCaptureSamplePhoto = () => {
    // Generate a professional SVG avatar placeholder with name initials and styling
    const initials = (name || 'Staff User').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    const colors = ['#2563eb', '#0d9488', '#7c3aed', '#059669', '#d97706'];
    const selectedColor = colors[Math.floor(Math.random() * colors.length)];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <defs>
        <radialGradient id="grad" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="${selectedColor}" stop-opacity="1"/>
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="100" fill="url(#grad)"/>
      <circle cx="100" cy="75" r="35" fill="#ffffff" opacity="0.95"/>
      <path d="M40 170 Q100 115 160 170 Z" fill="#ffffff" opacity="0.95"/>
      <text x="100" y="84" font-family="system-ui, sans-serif" font-size="24" font-weight="900" fill="${selectedColor}" text-anchor="middle">${initials}</text>
    </svg>`;
    setPhotoPreview(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const initialTasks: TaskAssignment[] = [];
      if (initialTaskTitle.trim()) {
        initialTasks.push({
          id: `tsk-${Date.now()}`,
          title: initialTaskTitle.trim(),
          description: initialTaskDesc.trim() || 'Assigned during onboarding',
          assignedToUserId: existingStaff?.id || '',
          assignedToName: name,
          assignedByUserId: 'usr-adm-1',
          assignedByName: 'Operations Manager',
          dueDate: initialTaskDueDate || new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
          priority: initialTaskPriority,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        });
      }

      const payload: Partial<UserType> = {
        name,
        employeeId,
        email,
        mobile,
        gender,
        staffType,
        residentialAddress,
        avatarUrl: photoPreview || undefined,
        role: staffType === 'OFFICE_STAFF' ? 'executive' : 'executive',
        status: 'ACTIVE',
        companyId,
        branchId,
        departmentId,
        designationId,
        shiftId,
        systemRoleId,
        password,
        dutyGpsStatus: 'GPS_ACTIVE',
        leavesEntitlement: {
          casual: casualLeaves,
          sick: sickLeaves,
          earned: earnedLeaves,
          usedCasual: existingStaff?.leavesEntitlement?.usedCasual || 0,
          usedSick: existingStaff?.leavesEntitlement?.usedSick || 0,
          usedEarned: existingStaff?.leavesEntitlement?.usedEarned || 0,
        },
        salarySetup: {
          baseSalaryMonthly: Number(baseSalary),
          dailyRate: Number(dailyRate),
          hourlyRate: Number(hourlyRate),
          payFrequency: 'MONTHLY',
          travelAllowance: Number(travelAllowance),
          specialAllowance: Number(specialAllowance),
          taxDeduction: Number(taxDeduction),
          providentFundDeduction: Number(pfDeduction),
          insuranceDeduction: 50,
          gpsAbsencePenaltyPerHour: Number(gpsPenaltyRate),
          overtimeHourlyRate: Number(hourlyRate) * 1.5,
        },
        assignedTasks: existingStaff?.assignedTasks ? [...existingStaff.assignedTasks, ...initialTasks] : initialTasks,
      };

      let saved: UserType;
      if (existingStaff?.id) {
        saved = await ApiService.updateStaff(existingStaff.id, payload);
      } else {
        saved = await ApiService.registerStaff(payload);
      }

      onSuccess(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save staff record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {existingStaff ? 'Edit Staff Profile' : 'Register New Staff Member'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Configure staff type, photograph, work schedule, shifts, and salary metrics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-4 text-xs font-semibold text-slate-600 shrink-0">
          <button
            onClick={() => setActiveTab('personal')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'personal'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            1. Personal & Photo
          </button>
          <button
            onClick={() => setActiveTab('job_shift')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'job_shift'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            2. Staff Type & Shift
          </button>
          <button
            onClick={() => setActiveTab('salary_leaves')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'salary_leaves'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Banknote className="w-3.5 h-3.5" />
            3. Salary & Leaves
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'tasks'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            4. Task Allocation
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: PERSONAL & PHOTOGRAPH */}
          {activeTab === 'personal' && (
            <div className="space-y-4">
              {/* Photo Upload Section */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-slate-200 border-2 border-dashed border-slate-300 flex items-center justify-center shrink-0 shadow-inner">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Staff Member Photograph
                  </div>
                  <p className="text-xs text-slate-500">
                    Visible during Live Tracking on map markers and visit verifications. JPG, PNG or camera snapshot.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start pt-1">
                    <label className="cursor-pointer px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 shadow-xs">
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      Upload Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoFileChange}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleCaptureSamplePhoto}
                      className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-100 flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Generate Profile Avatar
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rachel Adams"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Employee ID / Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="e.g. OF-201 or FE-109"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rachel.adams@fieldtrack.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mobile / Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="+1 (555) 456-7890"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Gender *
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other / Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Account Initial Password *
                  </label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Staff login password"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Residential Address Details *
                </label>
                <textarea
                  rows={2}
                  required
                  value={residentialAddress}
                  onChange={(e) => setResidentialAddress(e.target.value)}
                  placeholder="Flat/House No., Street Name, Landmark, City, State, Postal PIN Code"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: STAFF TYPE, MASTER LINKS & SHIFT */}
          {activeTab === 'job_shift' && (
            <div className="space-y-4">
              {/* Staff Type Selector Cards */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Staff Type *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Option A: Office Staff */}
                  <div
                    onClick={() => setStaffType('OFFICE_STAFF')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      staffType === 'OFFICE_STAFF'
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">a) Office Staff</span>
                      <Building className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Indoor desk attendance, branch geofence check-in, office duty hours.
                    </p>
                  </div>

                  {/* Option B: Field Staff */}
                  <div
                    onClick={() => setStaffType('FIELD_STAFF')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      staffType === 'FIELD_STAFF'
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">b) Field Staff</span>
                      <MapPin className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Continuous GPS tracking, client visits with photo verification, territory geofences.
                    </p>
                  </div>

                  {/* Option C: Field Runner */}
                  <div
                    onClick={() => setStaffType('FIELD_RUNNER')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      staffType === 'FIELD_RUNNER'
                        ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">c) Field Runner</span>
                      <Layers className="w-4 h-4 text-purple-600" />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Hybrid role: starts/ends at office, conducts field runs, deliveries and site tasks.
                    </p>
                  </div>
                </div>
              </div>

              {/* Master Data Linkages */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Company Master *
                  </label>
                  <select
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
                  >
                    {safeCompanies.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Branch Master *
                  </label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
                  >
                    {safeBranches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} - {b.city}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Department Master *
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
                  >
                    {safeDepartments.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Designation Master *
                  </label>
                  <select
                    value={designationId}
                    onChange={(e) => setDesignationId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
                  >
                    {safeDesignations.map(d => (
                      <option key={d.id} value={d.id}>{d.title} &bull; {d.level}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Shift Master & Timings *
                  </label>
                  <select
                    value={shiftId}
                    onChange={(e) => setShiftId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
                  >
                    {safeShifts.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.startTime} - {s.endTime}) &bull; {s.fullDayHours}h
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    System Role & Access *
                  </label>
                  <select
                    value={systemRoleId}
                    onChange={(e) => setSystemRoleId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
                  >
                    {safeRoles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SALARY SETUP & LEAVES ENTITLEMENT */}
          {activeTab === 'salary_leaves' && (
            <div className="space-y-4">
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
                <strong>Salary & Attendance Rule:</strong> Monthly and daily rates are used for automatic payroll computation.
                If staff turns OFF GPS during duty period, they are marked absent and the GPS penalty rate is deducted from the payout.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Base Monthly Salary ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Calculated Daily Rate ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Hourly Standard Rate ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Travel Allowance ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={travelAllowance}
                    onChange={(e) => setTravelAllowance(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Special Allowance ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={specialAllowance}
                    onChange={(e) => setSpecialAllowance(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-rose-700 uppercase tracking-wider mb-1">
                    GPS Disable Penalty ({currencySymbol}/hr)
                  </label>
                  <input
                    type="number"
                    value={gpsPenaltyRate}
                    onChange={(e) => setGpsPenaltyRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-rose-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-hidden font-mono text-rose-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Monthly Tax Deduction ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={taxDeduction}
                    onChange={(e) => setTaxDeduction(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    PF / Pension Deduction ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={pfDeduction}
                    onChange={(e) => setPfDeduction(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden font-mono"
                  />
                </div>
              </div>

              {/* Annual Leaves Entitlement */}
              <div className="pt-2 border-t border-slate-200">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Annual Leaves Quota (Days / Year)
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Casual Leave (CL)</label>
                    <input
                      type="number"
                      value={casualLeaves}
                      onChange={(e) => setCasualLeaves(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Sick Leave (SL)</label>
                    <input
                      type="number"
                      value={sickLeaves}
                      onChange={(e) => setSickLeaves(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Earned Leave (EL)</label>
                    <input
                      type="number"
                      value={earnedLeaves}
                      onChange={(e) => setEarnedLeaves(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TASK ALLOCATION */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
                Assign an onboarding task, special assignment, or client visit quota to this staff member.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Assignment Title
                </label>
                <input
                  type="text"
                  value={initialTaskTitle}
                  onChange={(e) => setInitialTaskTitle(e.target.value)}
                  placeholder="e.g. Metro Area Client Outreach & KYC Verification"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Task Instructions & Scope
                </label>
                <textarea
                  rows={3}
                  value={initialTaskDesc}
                  onChange={(e) => setInitialTaskDesc(e.target.value)}
                  placeholder="Details of the field task, expected visit locations, deliverables..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={initialTaskPriority}
                    onChange={(e) => setInitialTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={initialTaskDueDate}
                    onChange={(e) => setInitialTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500 font-medium">
              * Required fields. All profile changes reflect in live tracking and payroll.
            </div>

            <div className="flex items-center gap-2">
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
                    Saving Staff...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {existingStaff ? 'Update Staff Member' : 'Complete Registration'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
