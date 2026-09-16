import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  UserCheck, 
  Plus, 
  Edit3, 
  Trash2, 
  Users, 
  Check, 
  X, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Sparkles,
  MapPin,
  Briefcase,
  FileText,
  Layers,
  Settings,
  HelpCircle,
  Copy
} from 'lucide-react';
import { SystemRole, User, AllMastersData } from '../../types';
import { ApiService } from '../../services/api';

interface RolesManagementPanelProps {
  currentUser?: User;
}

export const RolesManagementPanel: React.FC<RolesManagementPanelProps> = () => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'assignments'>('catalog');
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [masters, setMasters] = useState<AllMastersData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL');

  // Role Editor Modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleForm, setRoleForm] = useState<Omit<SystemRole, 'id'>>({
    name: '',
    description: '',
    isSystemDefault: false,
    permissions: {
      canViewLiveMap: false,
      canManageStaff: false,
      canManageMasters: false,
      canApproveLeaves: false,
      canCalculateSalary: false,
      canViewReports: false,
      canManageGeofences: false,
      canVerifyVisits: false,
      canManageTasks: false,
      canEditCompanySettings: false,
      canManageRoles: false,
    },
  });

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [mastersRes, usersRes] = await Promise.all([
        ApiService.getAllMasters(),
        ApiService.getUsers(),
      ]);
      setMasters(mastersRes);
      setRoles(mastersRes.roles || []);
      setUsers(usersRes || []);
    } catch (err) {
      console.error('Failed to load roles and users:', err);
      showNotification('Failed to load roles data. Please check connection.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Open Editor for Creating New Custom Role
  const handleOpenCreateRole = () => {
    setEditingRoleId(null);
    setRoleForm({
      name: '',
      description: '',
      isSystemDefault: false,
      permissions: {
        canViewLiveMap: true,
        canManageStaff: false,
        canManageMasters: false,
        canApproveLeaves: false,
        canCalculateSalary: false,
        canViewReports: false,
        canManageGeofences: false,
        canVerifyVisits: true,
        canManageTasks: true,
        canEditCompanySettings: false,
        canManageRoles: false,
      },
    });
    setIsEditorOpen(true);
  };

  // Open Editor for Modifying Role
  const handleOpenEditRole = (role: SystemRole) => {
    setEditingRoleId(role.id);
    setRoleForm({
      name: role.name,
      description: role.description || '',
      isSystemDefault: !!role.isSystemDefault,
      permissions: {
        canViewLiveMap: !!role.permissions.canViewLiveMap,
        canManageStaff: !!role.permissions.canManageStaff,
        canManageMasters: !!role.permissions.canManageMasters,
        canApproveLeaves: !!role.permissions.canApproveLeaves,
        canCalculateSalary: !!role.permissions.canCalculateSalary,
        canViewReports: !!role.permissions.canViewReports,
        canManageGeofences: !!role.permissions.canManageGeofences,
        canVerifyVisits: !!role.permissions.canVerifyVisits,
        canManageTasks: !!role.permissions.canManageTasks,
        canEditCompanySettings: !!role.permissions.canEditCompanySettings,
        canManageRoles: !!role.permissions.canManageRoles,
      },
    });
    setIsEditorOpen(true);
  };

  // Duplicate an existing role to create custom variation
  const handleDuplicateRole = (role: SystemRole) => {
    setEditingRoleId(null);
    setRoleForm({
      name: `${role.name} (Custom Copy)`,
      description: `Custom policy based on ${role.name}`,
      isSystemDefault: false,
      permissions: { ...role.permissions },
    });
    setIsEditorOpen(true);
  };

  // Apply Quick Permission Preset
  const applyPreset = (preset: 'admin' | 'manager' | 'hr' | 'field' | 'auditor') => {
    if (preset === 'admin') {
      setRoleForm(prev => ({
        ...prev,
        permissions: {
          canViewLiveMap: true,
          canManageStaff: true,
          canManageMasters: true,
          canApproveLeaves: true,
          canCalculateSalary: true,
          canViewReports: true,
          canManageGeofences: true,
          canVerifyVisits: true,
          canManageTasks: true,
          canEditCompanySettings: true,
          canManageRoles: true,
        },
      }));
    } else if (preset === 'manager') {
      setRoleForm(prev => ({
        ...prev,
        permissions: {
          canViewLiveMap: true,
          canManageStaff: true,
          canManageMasters: false,
          canApproveLeaves: true,
          canCalculateSalary: true,
          canViewReports: true,
          canManageGeofences: true,
          canVerifyVisits: true,
          canManageTasks: true,
          canEditCompanySettings: false,
          canManageRoles: true,
        },
      }));
    } else if (preset === 'hr') {
      setRoleForm(prev => ({
        ...prev,
        permissions: {
          canViewLiveMap: false,
          canManageStaff: true,
          canManageMasters: true,
          canApproveLeaves: true,
          canCalculateSalary: true,
          canViewReports: true,
          canManageGeofences: false,
          canVerifyVisits: false,
          canManageTasks: false,
          canEditCompanySettings: false,
          canManageRoles: false,
        },
      }));
    } else if (preset === 'field') {
      setRoleForm(prev => ({
        ...prev,
        permissions: {
          canViewLiveMap: false,
          canManageStaff: false,
          canManageMasters: false,
          canApproveLeaves: false,
          canCalculateSalary: false,
          canViewReports: false,
          canManageGeofences: false,
          canVerifyVisits: false,
          canManageTasks: false,
          canEditCompanySettings: false,
          canManageRoles: false,
        },
      }));
    } else if (preset === 'auditor') {
      setRoleForm(prev => ({
        ...prev,
        permissions: {
          canViewLiveMap: true,
          canManageStaff: false,
          canManageMasters: false,
          canApproveLeaves: false,
          canCalculateSalary: false,
          canViewReports: true,
          canManageGeofences: false,
          canVerifyVisits: false,
          canManageTasks: false,
          canEditCompanySettings: false,
          canManageRoles: false,
        },
      }));
    }
  };

  // Save Role (Create or Update)
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.name.trim()) {
      showNotification('Role name is required', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (editingRoleId) {
        // Update
        const updated = await ApiService.updateMasterItem<SystemRole>('roles', editingRoleId, {
          name: roleForm.name.trim(),
          description: roleForm.description.trim(),
          permissions: roleForm.permissions,
        });
        setRoles(prev => prev.map(r => (r.id === editingRoleId ? updated : r)));
        showNotification(`Role "${updated.name}" updated successfully.`);
      } else {
        // Create new custom role
        const newRole = await ApiService.createMasterItem<SystemRole>('roles', {
          name: roleForm.name.trim(),
          description: roleForm.description.trim(),
          isSystemDefault: false,
          permissions: roleForm.permissions,
        });
        setRoles(prev => [...prev, newRole]);
        showNotification(`Custom role "${newRole.name}" created successfully.`);
      }
      setIsEditorOpen(false);
    } catch (err: any) {
      console.error('Save role error:', err);
      showNotification(err.message || 'Failed to save role policy.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Custom Role
  const handleDeleteRole = async (role: SystemRole) => {
    if (role.isSystemDefault) {
      showNotification('System predefined roles cannot be deleted.', 'error');
      return;
    }

    const assignedCount = users.filter(u => u.systemRoleId === role.id).length;
    if (assignedCount > 0) {
      showNotification(`Cannot delete: ${assignedCount} user(s) currently assigned to this role. Reassign them first.`, 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete custom role "${role.name}"?`)) {
      return;
    }

    try {
      await ApiService.deleteMasterItem('roles', role.id);
      setRoles(prev => prev.filter(r => r.id !== role.id));
      showNotification(`Role "${role.name}" deleted.`);
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete role.', 'error');
    }
  };

  // Assign Role to User
  const handleAssignUserRole = async (userId: string, newRoleId: string) => {
    setUpdatingUserId(userId);
    try {
      const updatedUser = await ApiService.updateStaff(userId, {
        systemRoleId: newRoleId,
      });
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, systemRoleId: newRoleId } : u)));
      const roleObj = roles.find(r => r.id === newRoleId);
      showNotification(`Assigned "${roleObj?.name || 'role'}" to ${updatedUser.name}.`);
    } catch (err: any) {
      console.error('Failed to assign role:', err);
      showNotification(err.message || 'Failed to assign role.', 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Filtered Users
  const filteredUsers = users.filter(user => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (user.name || '').toLowerCase().includes(term) ||
      (user.employeeId || '').toLowerCase().includes(term) ||
      (user.email || '').toLowerCase().includes(term);

    const matchesRole = filterRole === 'ALL' || user.systemRoleId === filterRole;
    const matchesDept = filterDepartment === 'ALL' || user.departmentId === filterDepartment;

    return matchesSearch && matchesRole && matchesDept;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Banner & Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Roles &amp; Access Policy Manager</h2>
              <p className="text-xs text-slate-500">
                Define custom authorization policies and assign predefined or tailored roles to staff members.
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher & Create Action */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold w-full md:w-auto">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 flex-1 md:flex-initial justify-center ${
                activeTab === 'catalog'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Roles &amp; Policies ({roles.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 flex-1 md:flex-initial justify-center ${
                activeTab === 'assignments'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>User Assignments ({users.length})</span>
            </button>
          </div>

          <button
            onClick={handleOpenCreateRole}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Custom Role</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
          notification.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
      )}

      {/* ================= VIEW 1: ROLES & POLICIES CATALOG ================= */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map(role => {
              const assignedUserCount = users.filter(u => u.systemRoleId === role.id).length;
              const permissions = role.permissions || {};

              return (
                <div
                  key={role.id}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{role.name}</h3>
                          {role.isSystemDefault ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              System Default
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Custom Role
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {role.description || 'Custom access policy for workforce members.'}
                        </p>
                      </div>

                      <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1 shrink-0">
                        <Users className="w-3 h-3" />
                        <span>{assignedUserCount}</span>
                      </span>
                    </div>

                    {/* Active Permission Badges */}
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Policy Grants
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {permissions.canViewLiveMap && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                            Live GPS Map
                          </span>
                        )}
                        {permissions.canManageStaff && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold">
                            Manage Staff
                          </span>
                        )}
                        {permissions.canApproveLeaves && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                            Approve Leaves
                          </span>
                        )}
                        {permissions.canCalculateSalary && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-semibold">
                            Payroll &amp; Salary
                          </span>
                        )}
                        {permissions.canManageMasters && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold">
                            Masters Setup
                          </span>
                        )}
                        {permissions.canManageGeofences && (
                          <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-semibold">
                            Geofences
                          </span>
                        )}
                        {permissions.canVerifyVisits && (
                          <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200 text-[10px] font-semibold">
                            Field Visits
                          </span>
                        )}
                        {permissions.canViewReports && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold">
                            Reports
                          </span>
                        )}
                        {permissions.canEditCompanySettings && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold">
                            Company Profile
                          </span>
                        )}
                        {permissions.canManageRoles && (
                          <span className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200 text-[10px] font-semibold">
                            Roles Manager
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                    <button
                      onClick={() => handleDuplicateRole(role)}
                      className="text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 transition-colors"
                      title="Duplicate as new custom role"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Duplicate</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditRole(role)}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition-colors flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Edit Policy</span>
                      </button>

                      {!role.isSystemDefault && (
                        <button
                          onClick={() => handleDeleteRole(role)}
                          className="p-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold transition-colors"
                          title="Delete custom role"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= VIEW 2: USER ROLE ASSIGNMENTS ================= */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search staff name, ID, email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold">Role:</span>
              </div>
              <select
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                <option value="ALL">All Roles</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>

              {masters?.departments && masters.departments.length > 0 && (
                <select
                  value={filterDepartment}
                  onChange={e => setFilterDepartment(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-hidden"
                >
                  <option value="ALL">All Departments</option>
                  {masters.departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="px-4 py-3">Staff Member</th>
                    <th className="px-4 py-3">Employee ID</th>
                    <th className="px-4 py-3">Department &amp; Designation</th>
                    <th className="px-4 py-3">Assigned System Role</th>
                    <th className="px-4 py-3">Access Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        No staff members found matching your search filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => {
                      const userRole = roles.find(r => r.id === user.systemRoleId);
                      const deptName = masters?.departments?.find(d => d.id === user.departmentId)?.name || 'Operations';
                      const desigName = masters?.designations?.find(d => d.id === user.designationId)?.name || user.staffType || 'Staff';
                      const isUpdating = updatingUserId === user.id;

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {user.avatarUrl ? (
                                <img
                                  src={user.avatarUrl}
                                  alt={user.name}
                                  className="w-8 h-8 rounded-full object-cover border border-slate-200"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                                  {user.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-slate-900">{user.name}</p>
                                <p className="text-[11px] text-slate-500">{user.email}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 font-mono font-bold text-slate-700">
                            {user.employeeId}
                          </td>

                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-800">{desigName}</p>
                            <p className="text-[11px] text-slate-500">{deptName}</p>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <select
                                value={user.systemRoleId || 'role-field'}
                                disabled={isUpdating}
                                onChange={e => handleAssignUserRole(user.id, e.target.value)}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-hidden hover:border-blue-400 transition-colors"
                              >
                                {roles.map(r => (
                                  <option key={r.id} value={r.id}>
                                    {r.name} {r.isSystemDefault ? '(System)' : '(Custom)'}
                                  </option>
                                ))}
                              </select>
                              {isUpdating && (
                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {userRole?.isSystemDefault ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  Default
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Custom
                                </span>
                              )}
                              <span className="text-[11px] text-slate-500 truncate max-w-[140px]">
                                {userRole?.description || 'Predefined system role'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= ROLE EDITOR MODAL ================= */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {editingRoleId ? 'Edit Role Policy' : 'Create Custom Role & Policy'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Configure granular access permissions for features and administrative tools.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4 text-xs">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Role Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Field Operations Lead"
                    value={roleForm.name}
                    onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Description / Purpose</label>
                  <input
                    type="text"
                    placeholder="e.g. Can monitor live staff and approve leave requests"
                    value={roleForm.description}
                    onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Apply Quick Permission Preset:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset('admin')}
                    className="px-2.5 py-1 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-700 font-semibold transition-colors"
                  >
                    Full Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('manager')}
                    className="px-2.5 py-1 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-700 font-semibold transition-colors"
                  >
                    Operations Manager
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('hr')}
                    className="px-2.5 py-1 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-700 font-semibold transition-colors"
                  >
                    HR &amp; Payroll Lead
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('field')}
                    className="px-2.5 py-1 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-700 font-semibold transition-colors"
                  >
                    Field Executive
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('auditor')}
                    className="px-2.5 py-1 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-700 font-semibold transition-colors"
                  >
                    Read-Only Auditor
                  </button>
                </div>
              </div>

              {/* Permissions Policy Matrix */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Access Control Policy Matrix
                </h4>

                {/* Group 1: Live Tracking & Field Ops */}
                <div className="border border-slate-200 rounded-2xl p-3.5 space-y-2">
                  <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>Live GPS &amp; Field Operations</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <label className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors">
                      <input
                        type="checkbox"
                        checked={!!roleForm.permissions.canViewLiveMap}
                        onChange={e => setRoleForm({
                          ...roleForm,
                          permissions: { ...roleForm.permissions, canViewLiveMap: e.target.checked }
                        })}
                        className="w-4 h-4 rounded-md text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-bold text-slate-800">Live GPS Tracking Map</p>
                        <p className="text-[10px] text-slate-500">View real-time agent locations on map</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors">
                      <input
                        type="checkbox"
                        checked={!!roleForm.permissions.canVerifyVisits}
                        onChange={e => setRoleForm({
                          ...roleForm,
                          permissions: { ...roleForm.permissions, canVerifyVisits: e.target.checked }
                        })}
                        className="w-4 h-4 rounded-md text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-bold text-slate-800">Verify Field Visits</p>
                        <p className="text-[10px] text-slate-500">Inspect client visits &amp; photo proof</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors">
                      <input
                        type="checkbox"
                        checked={!!roleForm.permissions.canManageGeofences}
                        onChange={e => setRoleForm({
                          ...roleForm,
                          permissions: { ...roleForm.permissions, canManageGeofences: e.target.checked }
                        })}
                        className="w-4 h-4 rounded-md text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-bold text-slate-800">Geofence Boundaries</p>
                        <p className="text-[10px] text-slate-500">Configure branch arrival/exit radii</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors">
                      <input
                        type="checkbox"
                        checked={!!roleForm.permissions.canManageTasks}
                        onChange={e => setRoleForm({
                          ...roleForm,
                          permissions: { ...roleForm.permissions, canManageTasks: e.target.checked }
                        })}
                        className="w-4 h-4 rounded-md text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-bold text-slate-800">Task Allocation</p>
                        <p className="text-[10px] text-slate-500">Dispatch assignments to field agents</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Group 2: HR, Leaves & Payroll */}
                <div className="border border-slate-200 rounded-2xl p-3.5 space-y-2">
                  <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Human Resources &amp; Attendance</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <label className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors">
                      <input
                        type="checkbox"
                        checked={!!roleForm.permissions.canManageStaff}
                        onChange={e => setRoleForm({
                          ...roleForm,
                          permissions: { ...roleForm.permissions, canManageStaff: e.target.checked }
                        })}
                        className="w-4 h-4 rounded-md text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-bold text-slate-800">Staff Records &amp; Enrollment</p>
                        <p className="text-[10px] text-slate-500">Register, edit staff and reset credentials</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors">
                      <input
                        type="checkbox"
                        checked={!!roleForm.permissions.canApproveLeaves}
                        onChange={e => setRoleForm({
                          ...roleForm,
                          permissions: { ...roleForm.permissions, canApproveLeaves: e.target.checked }
                        })}
                        className="w-4 h-4 rounded-md text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-bold text-slate-800">Leave Approvals</p>
                        <p className="text-[10px] text-slate-500">Approve or reject staff time-off</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors">
                      <input
                        type="checkbox"
                        checked={!!roleForm.permissions.canCalculateSalary}
                        onChange={e => setRoleForm({
                          ...roleForm,
                          permissions: { ...roleForm.permissions, canCalculateSalary: e.target.checked }
                        })}
                        className="w-4 h-4 rounded-md text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-bold text-slate-800">Payroll &amp; Salary Calculation</p>
                        <p className="text-[10px] text-slate-500">Generate monthly payslips and fines</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors">
                      <input
                        type="checkbox"
                        checked={!!roleForm.permissions.canViewReports}
                        onChange={e => setRoleForm({
                          ...roleForm,
                          permissions: { ...roleForm.permissions, canViewReports: e.target.checked }
                        })}
                        className="w-4 h-4 rounded-md text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-bold text-slate-800">Activity Reports &amp; Exports</p>
                        <p className="text-[10px] text-slate-500">Download mileage, attendance audits</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Group 3: System & Administration */}
                <div className="border border-slate-200 rounded-2xl p-3.5 space-y-2">
                  <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-indigo-600" />
                    <span>System Architecture &amp; Organization Governance</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <label className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors">
                      <input
                        type="checkbox"
                        checked={!!roleForm.permissions.canManageMasters}
                        onChange={e => setRoleForm({
                          ...roleForm,
                          permissions: { ...roleForm.permissions, canManageMasters: e.target.checked }
                        })}
                        className="w-4 h-4 rounded-md text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-bold text-slate-800">Master Setup</p>
                        <p className="text-[10px] text-slate-500">Configure Branches, Shifts, Departments</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors">
                      <input
                        type="checkbox"
                        checked={!!roleForm.permissions.canManageRoles}
                        onChange={e => setRoleForm({
                          ...roleForm,
                          permissions: { ...roleForm.permissions, canManageRoles: e.target.checked }
                        })}
                        className="w-4 h-4 rounded-md text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-bold text-slate-800">Roles &amp; Policy Manager</p>
                        <p className="text-[10px] text-slate-500">Create roles and assign user permissions</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={!!roleForm.permissions.canEditCompanySettings}
                        onChange={e => setRoleForm({
                          ...roleForm,
                          permissions: { ...roleForm.permissions, canEditCompanySettings: e.target.checked }
                        })}
                        className="w-4 h-4 rounded-md text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-bold text-slate-800">Organization Profile &amp; Anti-Tamper System</p>
                        <p className="text-[10px] text-slate-500">
                          Edit company name, address, phones, logo, coordinates, currency, and GPS duty rules
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{editingRoleId ? 'Update Policy' : 'Create Role'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
