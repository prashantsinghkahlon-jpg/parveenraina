import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Briefcase, 
  Award, 
  Clock, 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  CheckCircle2, 
  Layers,
  Users,
  Building,
  KeyRound,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { 
  CompanyMaster, 
  BranchMaster, 
  DepartmentMaster, 
  DesignationMaster, 
  ShiftMaster, 
  SystemRole 
} from '../../types';
import { ApiService, AllMastersData } from '../../services/api';
import { useOrganization } from '../../context/OrganizationContext';

interface MasterManagementProps {
  masters?: AllMastersData;
  onRefresh?: () => void;
}

type MasterSubTab = 'companies' | 'branches' | 'departments' | 'designations' | 'shifts' | 'roles';

export const MasterManagement: React.FC<MasterManagementProps> = ({ masters, onRefresh }) => {
  const { currencySymbol, currencyCode, formatCurrency } = useOrganization();
  const [activeTab, setActiveTab] = useState<MasterSubTab>('shifts');
  const [internalMasters, setInternalMasters] = useState<AllMastersData>({
    companies: [],
    branches: [],
    departments: [],
    designations: [],
    shifts: [],
    roles: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<{ type: MasterSubTab; data: any } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states for creation / editing
  const [formData, setFormData] = useState<any>({});

  const showNotification = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 3500);
  };

  const loadMasters = async () => {
    setIsLoading(true);
    try {
      const data = await ApiService.getAllMasters();
      if (data) {
        setInternalMasters({
          companies: Array.isArray(data.companies) ? data.companies : [],
          branches: Array.isArray(data.branches) ? data.branches : [],
          departments: Array.isArray(data.departments) ? data.departments : [],
          designations: Array.isArray(data.designations) ? data.designations : [],
          shifts: Array.isArray(data.shifts) ? data.shifts : [],
          roles: Array.isArray(data.roles) ? data.roles : [],
        });
      }
    } catch (err) {
      console.warn('Failed to load masters:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMasters();
  }, []);

  const effectiveMasters: AllMastersData = {
    companies: Array.isArray(masters?.companies) && masters.companies.length > 0 ? masters.companies : (internalMasters.companies || []),
    branches: Array.isArray(masters?.branches) && masters.branches.length > 0 ? masters.branches : (internalMasters.branches || []),
    departments: Array.isArray(masters?.departments) && masters.departments.length > 0 ? masters.departments : (internalMasters.departments || []),
    designations: Array.isArray(masters?.designations) && masters.designations.length > 0 ? masters.designations : (internalMasters.designations || []),
    shifts: Array.isArray(masters?.shifts) && masters.shifts.length > 0 ? masters.shifts : (internalMasters.shifts || []),
    roles: Array.isArray(masters?.roles) && masters.roles.length > 0 ? masters.roles : (internalMasters.roles || []),
  };

  // Open creation modal with tab-specific defaults
  const handleOpenCreate = (tab: MasterSubTab) => {
    setFormError(null);
    setEditingItem(null);
    setIsCreating(true);
    if (tab === 'shifts') {
      setFormData({
        code: `SH-${Math.floor(100 + Math.random() * 900)}`,
        name: '',
        startTime: '09:00',
        endTime: '18:00',
        gracePeriodMinutes: 15,
        halfDayThresholdHours: 4.5,
        fullDayHours: 8.5,
        isNightShift: false,
      });
    } else if (tab === 'companies') {
      setFormData({
        code: `COMP-${Math.floor(10 + Math.random() * 90)}`,
        name: '',
        address: '',
        phone: '',
        email: '',
        currencySymbol: '$',
        taxId: '',
        website: '',
      });
    } else if (tab === 'branches') {
      setFormData({
        code: `BR-${Math.floor(100 + Math.random() * 900)}`,
        name: '',
        companyId: effectiveMasters.companies[0]?.id || 'comp-1',
        address: '',
        city: '',
        state: '',
        latitude: 40.7128,
        longitude: -74.0060,
        geofenceRadiusMeters: 300,
        contactNumber: '',
      });
    } else if (tab === 'departments') {
      setFormData({
        code: `DEP-${Math.floor(10 + Math.random() * 90)}`,
        name: '',
        description: '',
      });
    } else if (tab === 'designations') {
      setFormData({
        code: `DES-${Math.floor(10 + Math.random() * 90)}`,
        title: '',
        departmentId: effectiveMasters.departments[0]?.id || 'dept-1',
        level: 'L1',
        minSalary: 3000,
        maxSalary: 4500,
        responsibilities: '',
      });
    }
  };

  const handleOpenEdit = (tab: MasterSubTab, item: any) => {
    setFormError(null);
    setIsCreating(false);
    setEditingItem({ type: tab, data: item });
    setFormData({ ...item });
  };

  // Save handler for creation or editing
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (editingItem) {
        // Update existing record
        await ApiService.updateMasterItem(editingItem.type, editingItem.data.id, formData);
        showNotification(`${editingItem.type.slice(0, -1)} updated successfully.`);
      } else {
        // Create new record
        await ApiService.createMasterItem(activeTab, formData);
        showNotification(`New ${activeTab.slice(0, -1)} created successfully.`);
      }

      setIsCreating(false);
      setEditingItem(null);
      await loadMasters();
      onRefresh?.();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save master record');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generic delete handler
  const handleDelete = async (type: MasterSubTab, id: string) => {
    if (!confirm(`Are you sure you want to delete this ${type.slice(0, -1)} record?`)) return;
    try {
      await ApiService.deleteMasterItem(type, id);
      showNotification('Record deleted successfully');
      await loadMasters();
      onRefresh?.();
    } catch (err: any) {
      alert(err.message || 'Failed to delete record');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Tab Navigation & Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => { setActiveTab('shifts'); setEditingItem(null); setIsCreating(false); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'shifts'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            Shift Master ({(effectiveMasters.shifts || []).length})
          </button>

          <button
            onClick={() => { setActiveTab('branches'); setEditingItem(null); setIsCreating(false); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'branches'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Branch Master ({(effectiveMasters.branches || []).length})
          </button>

          <button
            onClick={() => { setActiveTab('departments'); setEditingItem(null); setIsCreating(false); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'departments'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Department Master ({(effectiveMasters.departments || []).length})
          </button>

          <button
            onClick={() => { setActiveTab('designations'); setEditingItem(null); setIsCreating(false); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'designations'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4" />
            Designation Master ({(effectiveMasters.designations || []).length})
          </button>

          <button
            onClick={() => { setActiveTab('companies'); setEditingItem(null); setIsCreating(false); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'companies'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Company Master ({(effectiveMasters.companies || []).length})
          </button>

          <button
            onClick={() => { setActiveTab('roles'); setEditingItem(null); setIsCreating(false); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'roles'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            System Roles & Access ({(effectiveMasters.roles || []).length})
          </button>
        </div>

        <button
          onClick={loadMasters}
          disabled={isLoading}
          title="Reload Masters Data"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      </div>

      {statusNotice && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-800 text-xs font-semibold animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* SHIFTS MASTER */}
      {activeTab === 'shifts' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Shift Master & Working Timings</h3>
              <p className="text-xs text-slate-500 font-medium">
                Define duty working hours, grace periods, and half-day thresholds used for attendance & salary
              </p>
            </div>
            <button
              onClick={() => handleOpenCreate('shifts')}
              className="px-3.5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add New Shift
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {(effectiveMasters.shifts || []).map((shift) => (
              <div key={shift.id} className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-all bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                      {shift.code}
                    </span>
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      {shift.fullDayHours} hrs
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">{shift.name}</h4>
                  <div className="text-xs text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Working Timings:</span>
                      <strong className="font-mono text-slate-900">{shift.startTime} &ndash; {shift.endTime}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Grace Period:</span>
                      <span>{shift.gracePeriodMinutes} minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Half-Day Threshold:</span>
                      <span>{shift.halfDayThresholdHours} hours</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-200 text-xs">
                  <button
                    onClick={() => handleOpenEdit('shifts', shift)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                    title="Edit shift"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete('shifts', shift.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Delete shift"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BRANCH MASTER */}
      {activeTab === 'branches' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Branch Master</h3>
              <p className="text-xs text-slate-500 font-medium">Office locations, regional branch hubs, and geofence coordinates</p>
            </div>
            <button
              onClick={() => handleOpenCreate('branches')}
              className="px-3.5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add New Branch
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {(effectiveMasters.branches || []).map((b) => (
              <div key={b.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                      {b.code}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">{b.city}, {b.state}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">{b.name}</h4>
                  <p className="text-xs text-slate-600 mb-2">{b.address}</p>
                  <div className="text-[11px] font-mono bg-white p-2 rounded-lg border border-slate-200 text-slate-700">
                    GPS: {Number(b.latitude).toFixed(4)}, {Number(b.longitude).toFixed(4)} ({b.geofenceRadiusMeters}m radius)
                  </div>
                  {b.contactNumber && (
                    <div className="text-xs text-slate-500 mt-2">
                      Contact: {b.contactNumber}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-200 text-xs">
                  <button
                    onClick={() => handleOpenEdit('branches', b)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                    title="Edit branch"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete('branches', b.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Delete branch"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DEPARTMENT MASTER */}
      {activeTab === 'departments' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Department Master</h3>
              <p className="text-xs text-slate-500 font-medium">Functional departments across office and field divisions</p>
            </div>
            <button
              onClick={() => handleOpenCreate('departments')}
              className="px-3.5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add New Department
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
            {(effectiveMasters.departments || []).map((d) => (
              <div key={d.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                    {d.code}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm mt-2 mb-1">{d.name}</h4>
                  <p className="text-xs text-slate-500">{d.description || 'Enterprise department'}</p>
                </div>

                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-200 text-xs">
                  <button
                    onClick={() => handleOpenEdit('departments', d)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                    title="Edit department"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete('departments', d.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Delete department"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DESIGNATION MASTER */}
      {activeTab === 'designations' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Designation Master</h3>
              <p className="text-xs text-slate-500 font-medium">Job profiles, seniority levels, and salary pay bands</p>
            </div>
            <button
              onClick={() => handleOpenCreate('designations')}
              className="px-3.5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add New Designation
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
            {(effectiveMasters.designations || []).map((desig) => (
              <div key={desig.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                      {desig.code}
                    </span>
                    <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                      {desig.level}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mb-2">{desig.title}</h4>
                  <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <div>Pay Band: <strong>{formatCurrency(desig.minSalary)} - {formatCurrency(desig.maxSalary)}/mo</strong></div>
                    {desig.responsibilities && (
                      <div className="text-[11px] text-slate-500">{desig.responsibilities}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-200 text-xs">
                  <button
                    onClick={() => handleOpenEdit('designations', desig)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                    title="Edit designation"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete('designations', desig.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Delete designation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COMPANY MASTER */}
      {activeTab === 'companies' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Company Master</h3>
              <p className="text-xs text-slate-500 font-medium">Corporate entity details, registration, and currency setup</p>
            </div>
            <button
              onClick={() => handleOpenCreate('companies')}
              className="px-3.5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add New Company
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {(effectiveMasters.companies || []).map((comp) => (
              <div key={comp.id} className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{comp.name}</h4>
                      <span className="text-xs font-mono text-slate-500">Code: {comp.code}</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800">
                    Currency: {comp.currencySymbol}
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
                  <div><strong>Tax / Reg ID:</strong> {comp.taxId || comp.registrationNumber || 'N/A'}</div>
                  <div><strong>Address:</strong> {comp.address}</div>
                  <div><strong>Contact:</strong> {comp.phone} &bull; {comp.email}</div>
                  {comp.website && (
                    <div><strong>Website:</strong> {comp.website}</div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 text-xs">
                  <button
                    onClick={() => handleOpenEdit('companies', comp)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                    title="Edit company"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete('companies', comp.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Delete company"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SYSTEM ROLES & ACCESS MATRIX */}
      {activeTab === 'roles' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">System Roles & Permission Matrix</h3>
              <p className="text-xs text-slate-500 font-medium">
                Enterprise roles and granted authorizations across live tracking, masters, salary, and leaves
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {(effectiveMasters.roles || []).map((role) => (
              <div key={role.id} className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{role.name}</h4>
                      <p className="text-xs text-slate-500">{role.description}</p>
                    </div>
                  </div>
                  {role.isSystemDefault && (
                    <span className="text-[10px] font-bold text-slate-500 uppercase bg-white border border-slate-200 px-2 py-0.5 rounded">
                      System Default
                    </span>
                  )}
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Assigned Permissions
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div className="flex items-center gap-1.5">
                      {role.permissions?.canViewLiveMap ? <Check className="w-3.5 h-3.5 text-green-600" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
                      <span>Live GPS Map</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {role.permissions?.canManageStaff ? <Check className="w-3.5 h-3.5 text-green-600" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
                      <span>Staff Master / Register</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {role.permissions?.canManageMasters ? <Check className="w-3.5 h-3.5 text-green-600" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
                      <span>Enterprise Masters</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {role.permissions?.canCalculateSalary ? <Check className="w-3.5 h-3.5 text-green-600" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
                      <span>Salary & Payroll</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {role.permissions?.canApproveLeaves ? <Check className="w-3.5 h-3.5 text-green-600" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
                      <span>Leave Approvals</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {role.permissions?.canVerifyVisits ? <Check className="w-3.5 h-3.5 text-green-600" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
                      <span>Visit Verifications</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE / EDIT MASTER MODAL */}
      {(isCreating || editingItem) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => { setIsCreating(false); setEditingItem(null); }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
                {activeTab === 'shifts' && <Clock className="w-5 h-5" />}
                {activeTab === 'branches' && <MapPin className="w-5 h-5" />}
                {activeTab === 'departments' && <Briefcase className="w-5 h-5" />}
                {activeTab === 'designations' && <Award className="w-5 h-5" />}
                {activeTab === 'companies' && <Building2 className="w-5 h-5" />}
                {activeTab === 'roles' && <Shield className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingItem ? 'Edit' : 'Create New'} {activeTab.slice(0, -1).toUpperCase()}
                </h3>
                <p className="text-xs text-slate-500">Configure parameters for enterprise operations</p>
              </div>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-semibold mb-4">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveItem} className="space-y-4">
              {/* SHIFT FORM */}
              {activeTab === 'shifts' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Shift Code *</label>
                      <input
                        type="text"
                        required
                        value={formData.code || ''}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. GEN-0918"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Shift Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. Standard Morning Shift"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Start Time *</label>
                      <input
                        type="time"
                        required
                        value={formData.startTime || '09:00'}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">End Time *</label>
                      <input
                        type="time"
                        required
                        value={formData.endTime || '18:00'}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Grace Mins</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.gracePeriodMinutes ?? 15}
                        onChange={(e) => setFormData({ ...formData, gracePeriodMinutes: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Half-Day (hrs)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        value={formData.halfDayThresholdHours ?? 4.5}
                        onChange={(e) => setFormData({ ...formData, halfDayThresholdHours: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Full-Day (hrs)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        value={formData.fullDayHours ?? 8.5}
                        onChange={(e) => setFormData({ ...formData, fullDayHours: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* BRANCH FORM */}
              {activeTab === 'branches' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Branch Code *</label>
                      <input
                        type="text"
                        required
                        value={formData.code || ''}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. BR-NYC-HQ"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Branch Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. Manhattan Regional Hub"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Address *</label>
                    <input
                      type="text"
                      required
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. 450 Lexington Ave"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">City *</label>
                      <input
                        type="text"
                        required
                        value={formData.city || ''}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">State / Province</label>
                      <input
                        type="text"
                        value={formData.state || ''}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Latitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={formData.latitude ?? 40.7128}
                        onChange={(e) => setFormData({ ...formData, latitude: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Longitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={formData.longitude ?? -74.0060}
                        onChange={(e) => setFormData({ ...formData, longitude: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Radius (m)</label>
                      <input
                        type="number"
                        min="50"
                        value={formData.geofenceRadiusMeters ?? 300}
                        onChange={(e) => setFormData({ ...formData, geofenceRadiusMeters: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* DEPARTMENT FORM */}
              {activeTab === 'departments' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Department Code *</label>
                      <input
                        type="text"
                        required
                        value={formData.code || ''}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. OPS-FLD"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Department Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. Field Operations"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Brief role and mission of this department"
                    />
                  </div>
                </>
              )}

              {/* DESIGNATION FORM */}
              {activeTab === 'designations' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Designation Code *</label>
                      <input
                        type="text"
                        required
                        value={formData.code || ''}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. SFE-L2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Designation Title *</label>
                      <input
                        type="text"
                        required
                        value={formData.title || ''}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. Senior Field Executive"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Seniority Level</label>
                      <select
                        value={formData.level || 'L1'}
                        onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="L1">Level 1 (Junior)</option>
                        <option value="L2">Level 2 (Mid)</option>
                        <option value="Senior">Senior</option>
                        <option value="Lead">Lead / Manager</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Min Salary ({currencySymbol})</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.minSalary ?? 3000}
                        onChange={(e) => setFormData({ ...formData, minSalary: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Max Salary ({currencySymbol})</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.maxSalary ?? 4500}
                        onChange={(e) => setFormData({ ...formData, maxSalary: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Core Responsibilities</label>
                    <textarea
                      rows={2}
                      value={formData.responsibilities || ''}
                      onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="On-ground visits, audits, customer reports..."
                    />
                  </div>
                </>
              )}

              {/* COMPANY FORM */}
              {activeTab === 'companies' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Company Code *</label>
                      <input
                        type="text"
                        required
                        value={formData.code || ''}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. AFL-GLOBAL"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Company Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. Apex Field Logistics Ltd."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Headquarters Address *</label>
                    <input
                      type="text"
                      required
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                      <input
                        type="text"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Currency</label>
                      <input
                        type="text"
                        value={formData.currencySymbol || '$'}
                        onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); setEditingItem(null); }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingItem ? 'Update Record' : 'Create Record'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
