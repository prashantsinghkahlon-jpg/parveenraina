import { 
  User, 
  WorkSession, 
  LocationRecord, 
  FieldVisit, 
  PhotoRecord, 
  Geofence, 
  AdminSettings, 
  AlertItem, 
  BatchSyncResponse, 
  DailyActivitySummary, 
  CompanyMaster, 
  BranchMaster, 
  DepartmentMaster, 
  DesignationMaster, 
  ShiftMaster, 
  SystemRole, 
  LeaveRequest, 
  TaskAssignment, 
  SalaryCalculation,
  DutyRosterItem,
  AttendanceRegisterRecord,
  SystemStatus,
  SetupPayload,
  AuthResponse
} from '../types';

import { 
  getPendingSyncData, 
  markLocalRecordsSynced 
} from '../db/indexedDB';

const BASE_URL = '/api';

export interface AllMastersData {
  companies: CompanyMaster[];
  branches: BranchMaster[];
  departments: DepartmentMaster[];
  designations: DesignationMaster[];
  shifts: ShiftMaster[];
  roles: SystemRole[];
}

export class ApiService {
  /**
   * Ping server to check connectivity
   */
  static async checkServerHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/health`, { method: 'GET', cache: 'no-cache' });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Fetch system initialization & deployment status
   */
  static async getSystemStatus(): Promise<SystemStatus> {
    const res = await fetch(`${BASE_URL}/system/status`, { cache: 'no-cache' });
    if (!res.ok) throw new Error('Failed to check system deployment status');
    return res.json();
  }

  /**
   * First-Time Deployment Setup
   */
  static async setupSystem(payload: SetupPayload): Promise<AuthResponse> {
    const res = await fetch(`${BASE_URL}/system/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to complete first time setup');
    return data;
  }

  /**
   * Authenticate user with Email/Employee ID and Password
   */
  static async login(identifier: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed. Please check credentials.');
    return data;
  }

  /**
   * Verify active session token against server
   */
  static async getCurrentUser(): Promise<User | null> {
    const token = localStorage.getItem('fieldtrack_auth_token');
    if (!token) return null;
    try {
      const res = await fetch(`${BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-cache',
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.user || null;
    } catch {
      return null;
    }
  }

  /**
   * User logout
   */
  static async logout(): Promise<void> {
    const token = localStorage.getItem('fieldtrack_auth_token');
    try {
      await fetch(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });
    } catch {
      // Ignore network errors on logout
    }
  }

  /**
   * Reset system data / factory reset for deployment re-run
   */
  static async resetSystem(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${BASE_URL}/system/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to reset system');
    return res.json();
  }

  /**
   * Authenticate / Get users
   */
  static async getUsers(): Promise<User[]> {
    const res = await fetch(`${BASE_URL}/users`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  }

  static async getExecutives(): Promise<User[]> {
    const res = await fetch(`${BASE_URL}/executives`);
    if (!res.ok) throw new Error('Failed to fetch executives');
    return res.json();
  }

  static async getExecutiveDetails(id: string): Promise<{
    user: User;
    activeSession: WorkSession | null;
    recentLocations: LocationRecord[];
    visits: FieldVisit[];
    summary: DailyActivitySummary;
  }> {
    const res = await fetch(`${BASE_URL}/executives/${id}`);
    if (!res.ok) throw new Error('Failed to fetch executive details');
    return res.json();
  }

  /**
   * Fetch All Live Tracking Data for Manager Map
   */
  static async getLiveTrackingFeed(): Promise<{
    executives: (User & {
      latestLocation?: LocationRecord;
      activeSession?: WorkSession;
      todayVisitsCount: number;
    })[];
    geofences: Geofence[];
    activeAlertsCount: number;
  }> {
    const res = await fetch(`${BASE_URL}/tracking/live`);
    if (!res.ok) throw new Error('Failed to fetch live tracking feed');
    return res.json();
  }

  /**
   * Fetch Route History for a specific executive & date
   */
  static async getRouteHistory(executiveId: string, date?: string): Promise<{
    locations: LocationRecord[];
    visits: FieldVisit[];
    session: WorkSession | null;
    totalDistanceKm: number;
  }> {
    const query = date ? `?date=${date}` : '';
    const res = await fetch(`${BASE_URL}/executives/${executiveId}/route${query}`);
    if (!res.ok) throw new Error('Failed to fetch route history');
    return res.json();
  }

  /**
   * Field Visits & Verification
   */
  static async getAllVisits(filters?: { executiveId?: string; date?: string; verified?: boolean }): Promise<FieldVisit[]> {
    const params = new URLSearchParams();
    if (filters?.executiveId) params.append('executiveId', filters.executiveId);
    if (filters?.date) params.append('date', filters.date);
    if (filters?.verified !== undefined) params.append('verified', String(filters.verified));

    const res = await fetch(`${BASE_URL}/visits?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch visits');
    return res.json();
  }

  static async verifyVisit(visitId: string, verified: boolean, notes?: string): Promise<FieldVisit> {
    const res = await fetch(`${BASE_URL}/visits/${visitId}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verified, notes }),
    });
    if (!res.ok) throw new Error('Failed to verify visit');
    return res.json();
  }

  /**
   * Alerts
   */
  static async getAlerts(): Promise<AlertItem[]> {
    const res = await fetch(`${BASE_URL}/alerts`);
    if (!res.ok) throw new Error('Failed to fetch alerts');
    return res.json();
  }

  static async resolveAlert(alertId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/alerts/${alertId}/resolve`, { method: 'PATCH' });
    if (!res.ok) throw new Error('Failed to resolve alert');
  }

  /**
   * Admin Settings & Geofences
   */
  static async getSettings(): Promise<AdminSettings> {
    const res = await fetch(`${BASE_URL}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  }

  static async updateSettings(settings: Partial<AdminSettings>): Promise<AdminSettings> {
    const res = await fetch(`${BASE_URL}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  }

  static async getGeofences(): Promise<Geofence[]> {
    const res = await fetch(`${BASE_URL}/geofences`);
    if (!res.ok) throw new Error('Failed to fetch geofences');
    return res.json();
  }

  static async saveGeofence(geofence: Partial<Geofence>): Promise<Geofence> {
    const res = await fetch(`${BASE_URL}/geofences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geofence),
    });
    if (!res.ok) throw new Error('Failed to save geofence');
    return res.json();
  }

  static async deleteGeofence(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/geofences/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete geofence');
  }

  /**
   * Reports
   */
  static async getDailyReports(date?: string): Promise<DailyActivitySummary[]> {
    const query = date ? `?date=${date}` : '';
    const res = await fetch(`${BASE_URL}/reports/daily${query}`);
    if (!res.ok) throw new Error('Failed to fetch daily reports');
    return res.json();
  }

  /**
   * Synchronize Batch from IndexedDB to Server
   */
  static async syncPendingRecords(userId?: string): Promise<{
    syncedCount: number;
    failedCount: number;
    response?: BatchSyncResponse;
  }> {
    const pendingData = await getPendingSyncData(userId);
    if (pendingData.totalCount === 0) {
      return { syncedCount: 0, failedCount: 0 };
    }

    try {
      const res = await fetch(`${BASE_URL}/sync/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessions: pendingData.sessions,
          locationRecords: pendingData.locations,
          visits: pendingData.visits,
          photos: pendingData.photos,
          clientTimestamp: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const syncResult: BatchSyncResponse = await res.json();

      if (syncResult.syncedRecordIds && syncResult.syncedRecordIds.length > 0) {
        await markLocalRecordsSynced(syncResult.syncedRecordIds);
      }

      return {
        syncedCount: syncResult.syncedRecordIds.length,
        failedCount: syncResult.failedRecordIds ? syncResult.failedRecordIds.length : 0,
        response: syncResult,
      };
    } catch (err) {
      console.warn('Sync failed, items remain safely in local IndexedDB queue:', err);
      throw err;
    }
  }

  /**
   * Seed Mock Database
   */
  static async seedMockData(): Promise<void> {
    const res = await fetch(`${BASE_URL}/seed`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to re-seed demo data');
  }

  /**
   * Enterprise Masters Management
   */
  static async getCompanyProfile(): Promise<CompanyMaster> {
    const res = await fetch(`${BASE_URL}/system/company`);
    if (!res.ok) throw new Error('Failed to fetch company profile');
    return res.json();
  }

  static async updateCompanyProfile(data: Partial<CompanyMaster>): Promise<CompanyMaster> {
    const res = await fetch(`${BASE_URL}/system/company`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update company profile');
    return res.json();
  }

  static async getAllMasters(): Promise<AllMastersData> {
    const res = await fetch(`${BASE_URL}/masters`);
    if (!res.ok) throw new Error('Failed to fetch master data');
    return res.json();
  }

  static async getShifts(): Promise<ShiftMaster[]> {
    try {
      const masters = await this.getAllMasters();
      return masters.shifts || [];
    } catch {
      return [];
    }
  }

  static async getDepartments(): Promise<DepartmentMaster[]> {
    try {
      const masters = await this.getAllMasters();
      return masters.departments || [];
    } catch {
      return [];
    }
  }

  static async createMasterItem<T>(type: 'companies' | 'branches' | 'departments' | 'designations' | 'shifts' | 'roles', data: Partial<T>): Promise<T> {
    const res = await fetch(`${BASE_URL}/masters/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to create ${type} record`);
    return res.json();
  }

  static async updateMasterItem<T>(type: 'companies' | 'branches' | 'departments' | 'designations' | 'shifts' | 'roles', id: string, data: Partial<T>): Promise<T> {
    const res = await fetch(`${BASE_URL}/masters/${type}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to update ${type} record`);
    return res.json();
  }

  static async deleteMasterItem(type: 'companies' | 'branches' | 'departments' | 'designations' | 'shifts' | 'roles', id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/masters/${type}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete ${type} record`);
  }

  /**
   * Staff Registration & User Management
   */
  static async registerStaff(staffData: Partial<User>): Promise<User> {
    const res = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(staffData),
    });
    if (!res.ok) throw new Error('Failed to register staff member');
    return res.json();
  }

  static async updateStaff(id: string, staffData: Partial<User>): Promise<User> {
    const res = await fetch(`${BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(staffData),
    });
    if (!res.ok) throw new Error('Failed to update staff record');
    return res.json();
  }

  static async resetStaffPassword(userId: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${BASE_URL}/users/${userId}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    });
    if (!res.ok) throw new Error('Failed to reset password');
    return res.json();
  }

  static async resetOwnPassword(employeeId: string, email: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, email, newPassword }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to reset password');
    }
    return res.json();
  }

  /**
   * Leave Management
   */
  static async getLeaveRequests(userId?: string): Promise<LeaveRequest[]> {
    const query = userId ? `?userId=${userId}` : '';
    const res = await fetch(`${BASE_URL}/leaves${query}`);
    if (!res.ok) throw new Error('Failed to fetch leave requests');
    return res.json();
  }

  static async submitLeaveRequest(data: Omit<LeaveRequest, 'id' | 'status' | 'appliedAt'>): Promise<LeaveRequest> {
    const res = await fetch(`${BASE_URL}/leaves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to submit leave request');
    return res.json();
  }

  static async reviewLeaveRequest(leaveId: string, status: 'APPROVED' | 'REJECTED', reviewNotes?: string, reviewerName?: string): Promise<LeaveRequest> {
    const res = await fetch(`${BASE_URL}/leaves/${leaveId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reviewNotes, reviewerName }),
    });
    if (!res.ok) throw new Error('Failed to update leave status');
    return res.json();
  }

  /**
   * Tasks / Special Assignments
   */
  static async getTasks(userId?: string): Promise<TaskAssignment[]> {
    const query = userId ? `?userId=${userId}` : '';
    const res = await fetch(`${BASE_URL}/tasks${query}`);
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  }

  static async createTask(task: Omit<TaskAssignment, 'id' | 'createdAt'>): Promise<TaskAssignment> {
    const res = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (!res.ok) throw new Error('Failed to allocate task');
    return res.json();
  }

  static async updateTaskStatus(taskId: string, status: TaskAssignment['status']): Promise<TaskAssignment> {
    const res = await fetch(`${BASE_URL}/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update task status');
    return res.json();
  }

  /**
   * Real-time GPS Duty Enforcement
   * Staff must keep GPS enabled throughout duty. Disabling marks them absent.
   */
  static async reportGpsDutyStatus(userId: string, isGpsDisabled: boolean, coordinates?: { lat: number; lng: number; accuracy: number }): Promise<{
    dutyGpsStatus: 'GPS_ACTIVE' | 'GPS_DISABLED_ABSENT';
    message: string;
  }> {
    const res = await fetch(`${BASE_URL}/tracking/gps-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, isGpsDisabled, coordinates }),
    });
    if (!res.ok) throw new Error('Failed to report GPS duty status');
    return res.json();
  }

  /**
   * Salary & Payroll Calculation as per Attendance
   */
  static async calculateSalaries(month: string, branchId?: string, userId?: string): Promise<{
    month: string;
    totalWorkingDays: number;
    totalPayroll: number;
    totalAbsencePenalties: number;
    calculations: SalaryCalculation[];
  }> {
    const params = new URLSearchParams({ month });
    if (branchId) params.append('branchId', branchId);
    if (userId) params.append('userId', userId);

    const res = await fetch(`${BASE_URL}/payroll/calculate?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to calculate payroll');
    return res.json();
  }

  /**
   * Duty Roster Management
   */
  static async getRosters(params?: { userId?: string; date?: string; month?: string }): Promise<DutyRosterItem[]> {
    const query = new URLSearchParams();
    if (params?.userId) query.append('userId', params.userId);
    if (params?.date) query.append('date', params.date);
    if (params?.month) query.append('month', params.month);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${BASE_URL}/rosters${qs}`);
    if (!res.ok) throw new Error('Failed to fetch duty rosters');
    return res.json();
  }

  static async saveRosters(rosters: DutyRosterItem | DutyRosterItem[]): Promise<{ success: boolean; count: number; rosters: DutyRosterItem[] }> {
    const res = await fetch(`${BASE_URL}/rosters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rosters),
    });
    if (!res.ok) throw new Error('Failed to save duty roster');
    return res.json();
  }

  static async deleteRoster(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/rosters/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete duty roster entry');
    return res.json();
  }

  /**
   * Attendance Register & Verification
   */
  static async getAttendanceRegister(date: string): Promise<{
    date: string;
    summary: {
      totalStaff: number;
      presentCount: number;
      lateCount: number;
      halfDayCount: number;
      absentCount: number;
      onLeaveCount: number;
      weeklyOffCount: number;
      totalWorkingHours: number;
    };
    records: AttendanceRegisterRecord[];
  }> {
    const res = await fetch(`${BASE_URL}/attendance/register?date=${encodeURIComponent(date)}`);
    if (!res.ok) throw new Error('Failed to fetch attendance register');
    return res.json();
  }

  /**
   * Report Duty Compliance / GPS switch off alert
   */
  static async reportDutyComplianceAlert(data: {
    userId: string;
    employeeId: string;
    employeeName: string;
    type?: string;
    message?: string;
    timestamp?: string;
  }): Promise<{ success: boolean; alert: any }> {
    const res = await fetch(`${BASE_URL}/compliance/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to report compliance alert');
    return res.json();
  }

  /**
   * System Data Backup & Disaster Recovery
   */
  static async getSystemBackup(): Promise<any> {
    const res = await fetch(`${BASE_URL}/system/backup`);
    if (!res.ok) throw new Error('Failed to export system backup');
    return res.json();
  }

  static async restoreSystemBackup(backupData: any): Promise<{ success: boolean; message: string; stats?: any }> {
    const res = await fetch(`${BASE_URL}/system/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backupData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to restore system backup');
    }
    return res.json();
  }

  /**
   * Reinstates and migrates previous installation database on reinstallation / republishing
   */
  static async reinstatePreviousDatabase(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${BASE_URL}/system/reinstate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runMigration: true }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to reinstate previous database');
    }
    return res.json();
  }

  /**
   * Checks if staff is on approved leave today and eligible to mark attendance
   */
  static async checkInEligibilityCheck(userId?: string, employeeId?: string, date?: string): Promise<{ allowed: boolean; error?: string; leave?: LeaveRequest }> {
    const res = await fetch(`${BASE_URL}/tracking/check-in-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, employeeId, date }),
    });
    return res.json();
  }
}
