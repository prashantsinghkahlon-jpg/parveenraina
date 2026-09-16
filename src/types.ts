export type UserRole = 'executive' | 'manager' | 'admin';

export type StaffType = 'OFFICE_STAFF' | 'FIELD_STAFF' | 'FIELD_RUNNER';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export type DutyGpsStatus = 'GPS_ACTIVE' | 'GPS_DISABLED_ABSENT';

export type LeaveType = 'CASUAL' | 'SICK' | 'EARNED' | 'PAID' | 'HALF_DAY' | 'UNPAID';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'RETRY_PENDING';

export type WageType = 'MONTHLY' | 'HOURLY';

export type TravelAllowanceType = 'PER_KM' | 'LUMPSUM' | 'NONE';

export type ValidationFlag = 
  | 'LOW_GPS_ACCURACY'
  | 'SUSPICIOUS_SPEED'
  | 'UNUSUAL_LOCATION_JUMP'
  | 'OUTSIDE_GEOFENCE'
  | 'MANUAL_REVIEW_REQUIRED'
  | 'GPS_DISABLED_ABSENT'
  | 'NORMAL';

export interface SalarySetup {
  wageType?: WageType; // 'MONTHLY' or 'HOURLY'
  baseSalaryMonthly: number;
  dailyRate: number;
  hourlyRate: number;
  payFrequency: 'MONTHLY' | 'BIWEEKLY' | 'WEEKLY';
  
  // Travel Allowance
  travelAllowanceType?: TravelAllowanceType; // 'PER_KM' | 'LUMPSUM' | 'NONE'
  ratePerKm?: number; // e.g. 0.50 or 5.00
  lumpsumTravelAllowance?: number; // fixed lumpsum amount
  travelAllowance: number; // final computed or assigned
  
  specialAllowance: number;
  providentFundDeduction: number;
  taxDeduction: number;
  insuranceDeduction: number;
  gpsAbsencePenaltyPerHour: number;
  overtimeHourlyRate: number;
}

export interface LeaveEntitlement {
  casual: number;
  sick: number;
  earned: number;
  usedCasual: number;
  usedSick: number;
  usedEarned: number;
}

export interface TaskAssignment {
  id: string;
  title: string;
  description: string;
  assignedToUserId: string;
  assignedToName: string;
  assignedByUserId: string;
  assignedByName: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  completedAt?: string;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  staffType?: StaffType;
  leaveType: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  daysCount: number;
  reason: string;
  status: LeaveStatus;
  appliedAt: string;
  reviewedBy?: string;
  reviewNotes?: string;
  reviewedAt?: string;
}

export interface CompanyMaster {
  id: string;
  name: string;
  code: string;
  registrationNumber?: string;
  taxId?: string;
  address: string;
  phone: string;
  email: string;
  currencySymbol: string;
  currencyCode?: string;
  logoUrl?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface BranchMaster {
  id: string;
  code: string;
  name: string;
  companyId: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
  managerId?: string;
  managerName?: string;
  contactNumber?: string;
}

export interface DepartmentMaster {
  id: string;
  code: string;
  name: string;
  headOfDepartment?: string;
  description?: string;
}

export interface DesignationMaster {
  id: string;
  code: string;
  title: string;
  departmentId: string;
  level: string; // 'L1', 'L2', 'L3', 'Senior', 'Lead'
  minSalary: number;
  maxSalary: number;
  responsibilities?: string;
}

export interface ShiftMaster {
  id: string;
  code: string;
  name: string;
  startTime: string; // "09:00"
  endTime: string; // "18:00"
  gracePeriodMinutes: number; // e.g. 15 mins
  halfDayThresholdHours: number; // e.g. 4.5 hours
  fullDayHours: number; // e.g. 8.5 hours
  isNightShift?: boolean;
}

export interface SystemRole {
  id: string;
  name: string;
  description: string;
  isSystemDefault?: boolean;
  permissions: {
    canViewLiveMap: boolean;
    canManageStaff: boolean;
    canManageMasters: boolean;
    canApproveLeaves: boolean;
    canCalculateSalary: boolean;
    canViewReports: boolean;
    canManageGeofences: boolean;
    canVerifyVisits: boolean;
    canManageTasks: boolean;
    canEditCompanySettings?: boolean;
    canManageRoles?: boolean;
  };
}

export interface SalaryCalculation {
  id: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  staffType: StaffType;
  designationTitle: string;
  departmentName: string;
  month: string; // YYYY-MM
  totalWorkingDays: number;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  approvedPaidLeaves: number;
  gpsDisabledHours: number;
  overtimeHours: number;
  wageType?: WageType;
  totalDutyHours?: number;
  travelAllowanceType?: TravelAllowanceType;
  totalDistanceKm?: number;
  ratePerKm?: number;
  baseSalary: number;
  earnedBaseSalary: number;
  travelAllowance: number;
  specialAllowance: number;
  totalAllowances: number;
  gpsAbsenceDeductions: number;
  statutoryDeductions: number;
  taxDeduction: number;
  netPayableSalary: number;
  paymentStatus: 'DRAFT' | 'APPROVED' | 'PAID';
  calculatedAt: string;
}

export interface User {
  id: string;
  employeeId: string;
  name: string;
  role: UserRole;
  staffType?: StaffType;
  gender?: Gender;
  residentialAddress?: string;
  email: string;
  mobile: string;
  avatarUrl?: string;
  status: 'ACTIVE' | 'INACTIVE';
  assignedManagerId?: string;
  assignedGeofenceId?: string;
  companyId?: string;
  branchId?: string;
  departmentId?: string;
  designationId?: string;
  shiftId?: string;
  systemRoleId?: string;
  password?: string;
  gpsUpdateIntervalSeconds?: number;
  wageType?: WageType;
  hourlyRate?: number;
  travelAllowanceType?: TravelAllowanceType;
  ratePerKm?: number;
  lumpsumTravelAllowance?: number;
  leavesEntitlement?: LeaveEntitlement;
  salarySetup?: SalarySetup;
  assignedTasks?: TaskAssignment[];
  dutyGpsStatus?: DutyGpsStatus;
  gpsDisabledAt?: string;
  totalGpsDisabledMinutesToday?: number;
  lastActiveAt?: string;
  currentStatus?: 'CHECKED_IN' | 'CHECKED_OUT' | 'IDLE' | 'OFFLINE';
}

export interface WorkSession {
  id: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // ISO
  checkInLatitude: number;
  checkInLongitude: number;
  checkInAccuracy: number;
  checkInPhotoUrl?: string;
  checkOutTime?: string; // ISO
  checkOutLatitude?: number;
  checkOutLongitude?: number;
  checkOutAccuracy?: number;
  checkOutPhotoUrl?: string;
  status: 'ACTIVE' | 'COMPLETED';
  totalUpdates: number;
  totalVisits: number;
  totalDistanceKm: number;
  totalDurationHours?: number;
  syncStatus: SyncStatus;
  createdAt: string;
}

export interface LocationRecord {
  id: string; // UUID
  userId: string;
  employeeId: string;
  employeeName: string;
  sessionId: string;
  latitude: number;
  longitude: number;
  accuracy: number; // in meters
  altitude?: number | null;
  speed?: number | null; // in m/s or km/h
  heading?: number | null;
  capturedAt: string; // ISO client timestamp
  deviceTimestamp: string;
  receivedAt?: string; // ISO server timestamp
  syncStatus: SyncStatus;
  validationFlags: ValidationFlag[];
  batteryLevel?: number;
  isManualUpdate?: boolean;
  remarks?: string;
  locationName?: string;
}

export interface FieldVisit {
  id: string; // UUID
  userId: string;
  employeeId: string;
  employeeName: string;
  sessionId: string;
  visitName: string; // Customer / Doctor / Client name
  locationName: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string; // ISO client timestamp
  deviceTimestamp: string;
  receivedAt?: string;
  remarks?: string;
  photoUrl: string; // Base64 data URL or remote path
  photoThumbnail?: string;
  syncStatus: SyncStatus;
  validationFlags: ValidationFlag[];
  verifiedByManager?: boolean;
  managerNotes?: string;
}

export interface PhotoRecord {
  id: string; // UUID
  userId: string;
  employeeId: string;
  relatedRecordId: string; // Session ID or Visit ID or Location ID
  relatedRecordType: 'CHECK_IN' | 'CHECK_OUT' | 'VISIT' | 'LOCATION_UPDATE';
  imageBase64: string;
  capturedAt: string;
  latitude: number;
  longitude: number;
  gpsAccuracy: number;
  deviceTimestamp: string;
  serverReceivedAt?: string;
  syncStatus: SyncStatus;
}

export interface Geofence {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  color?: string;
  assignedUserIds: string[];
  type?: 'CLIENT_SITE' | 'WORK_AREA' | 'WAREHOUSE' | 'HEADQUARTERS' | 'RESTRICTED_ZONE';
  alertOnExit?: boolean;
  alertOnEntry?: boolean;
  isActive?: boolean;
  address?: string;
}

export interface AdminSettings {
  gpsTrackingIntervalSeconds: number;
  minMovementDistanceMeters: number;
  maxAcceptableGpsAccuracyMeters: number;
  maxInactiveDurationMinutes: number;
  suspiciousSpeedThresholdKmh: number;
  workingHoursStart: string; // "09:00"
  workingHoursEnd: string; // "18:00"
  requirePhotoForCheckIn: boolean;
  requirePhotoForLocationUpdate: boolean;
  requirePhotoForCheckOut: boolean;
  autoTrackingEnabled: boolean;
  cameraQuality: 'low' | 'medium' | 'high';
  mapApiKey?: string;
  mapProvider?: 'openstreetmap' | 'google' | 'mapbox';
  mapCustomTileUrl?: string;
  enableHighResGeocoding?: boolean;
  mapboxToken?: string;
  mapTileUrl?: string;
  hideWatermarks?: boolean;
}

export interface DutyRosterItem {
  id: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  shiftId: string;
  shiftName: string;
  startTime: string; // "09:00"
  endTime: string;   // "18:00"
  date: string;      // "YYYY-MM-DD"
  isWeeklyOff?: boolean;
  notes?: string;
}

export interface AttendanceRegisterRecord {
  id: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  departmentName: string;
  designationTitle: string;
  date: string; // YYYY-MM-DD
  shiftName: string;
  scheduledStart: string; // "09:00"
  scheduledEnd: string;   // "18:00"
  inTime: string | null;  // e.g. "09:08 AM" or ISO
  outTime: string | null; // e.g. "06:15 PM" or ISO
  workingHours: number;   // 8.2
  status: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'ON_LEAVE' | 'WEEKLY_OFF';
  lateMinutes: number;
  earlyDepartureMinutes: number;
  overtimeHours: number;
  gpsActiveHours: number;
  gpsContinuity: 'ACTIVE' | 'VIOLATED' | 'OFFLINE';
  verifiedVisits: number;
  remarks: string;
}

export interface BackupPayload {
  version: string;
  exportTimestamp: string;
  companyName: string;
  data: any;
}

export interface AlertItem {
  id: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  type: ValidationFlag | 'NO_UPDATE_ALERT' | 'UNSYNCED_ALERT';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  timestamp: string;
  recordId?: string;
  resolved: boolean;
}

export interface BatchSyncPayload {
  sessions: WorkSession[];
  locationRecords: LocationRecord[];
  visits: FieldVisit[];
  photos: PhotoRecord[];
  clientTimestamp: string;
}

export interface BatchSyncResponse {
  success: boolean;
  syncedRecordIds: string[];
  failedRecordIds: { id: string; error: string }[];
  serverTimestamp: string;
  message: string;
}

export interface DailyActivitySummary {
  userId: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  durationMinutes: number;
  totalUpdates: number;
  totalVisits: number;
  totalDistanceKm: number;
  syncStatus: SyncStatus;
  hasSuspiciousFlags: boolean;
  lastKnownLatitude?: number;
  lastKnownLongitude?: number;
  lastActiveAt?: string;
}

export interface AllMastersData {
  companies: CompanyMaster[];
  branches: BranchMaster[];
  departments: DepartmentMaster[];
  designations: DesignationMaster[];
  shifts: ShiftMaster[];
  roles: SystemRole[];
}

export interface SystemStatus {
  isInitialized: boolean;
  hasAdmin: boolean;
  companyName?: string;
  companyCode?: string;
  companyLogo?: string;
  currencySymbol?: string;
  currencyCode?: string;
  totalUsers: number;
  version: string;
  hasExistingData?: boolean;
  existingDataSummary?: {
    usersCount: number;
    companyName: string;
    sessionsCount: number;
    geofencesCount: number;
    lastUpdated?: string;
  };
}

export interface SetupPayload {
  admin: {
    name: string;
    email: string;
    employeeId: string;
    password: string;
    mobile: string;
  };
  company: {
    name: string;
    code: string;
    address: string;
    city?: string;
    state?: string;
    phone: string;
    email: string;
    currencySymbol: string;
    currencyCode: string;
    timezone?: string;
    latitude?: number;
    longitude?: number;
  };
  defaults?: {
    shiftName?: string;
    startTime?: string;
    endTime?: string;
    geofenceRadiusMeters?: number;
    createSampleStaff?: boolean;
  };
}

export interface LoginCredentials {
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  token: string;
  message?: string;
}
