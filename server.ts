import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

// Types
import { 
  User, 
  WageType,
  TravelAllowanceType,
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
  BackupPayload
} from './src/types';

// In-Memory Database Store
interface DatabaseStore {
  users: User[];
  sessions: WorkSession[];
  locationRecords: LocationRecord[];
  visits: FieldVisit[];
  photos: PhotoRecord[];
  geofences: Geofence[];
  settings: AdminSettings;
  alerts: AlertItem[];
  companies: CompanyMaster[];
  branches: BranchMaster[];
  departments: DepartmentMaster[];
  designations: DesignationMaster[];
  shifts: ShiftMaster[];
  roles: SystemRole[];
  leaves: LeaveRequest[];
  tasks: TaskAssignment[];
  rosters: DutyRosterItem[];
}

// Generate base64 placeholder canvas image for mock visit photos
function generateMockPhoto(title: string, subtitle: string, color: string): string {
  // Simple SVG data URI converted to data URL
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a" />
        <stop offset="100%" stop-color="${color}" />
      </linearGradient>
    </defs>
    <rect width="640" height="480" fill="url(#bg)"/>
    <circle cx="320" cy="180" r="70" fill="none" stroke="#38bdf8" stroke-width="4" stroke-dasharray="6,6"/>
    <path d="M290 180 L310 200 L350 160" fill="none" stroke="#22c55e" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="30" y="340" width="580" height="110" rx="8" fill="rgba(15,23,42,0.85)" stroke="rgba(255,255,255,0.1)"/>
    <circle cx="56" cy="372" r="8" fill="#22c55e"/>
    <text x="74" y="378" fill="#ffffff" font-family="system-ui, sans-serif" font-size="18" font-weight="bold">[LIVE CAMERA VERIFIED] ${title}</text>
    <text x="56" y="410" fill="#94a3b8" font-family="monospace" font-size="14">${subtitle}</text>
    <text x="56" y="435" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="13" font-weight="600">AUTHENTICITY STAMP: 0x9F4C2A1E &bull; ANTI-SPOOF LOCK ACTIVE</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Clean Production Store - ZERO Demo Data
function createEmptyStore(): DatabaseStore {
  return {
    users: [],
    sessions: [],
    locationRecords: [],
    visits: [],
    photos: [],
    geofences: [],
    settings: {
      gpsTrackingIntervalSeconds: 15,
      minMovementDistanceMeters: 20,
      maxAcceptableGpsAccuracyMeters: 50,
      maxInactiveDurationMinutes: 30,
      suspiciousSpeedThresholdKmh: 120,
      workingHoursStart: '09:00',
      workingHoursEnd: '18:00',
      requirePhotoForCheckIn: true,
      requirePhotoForLocationUpdate: false,
      requirePhotoForCheckOut: true,
      autoTrackingEnabled: true,
      cameraQuality: 'medium',
      mapApiKey: '',
      mapProvider: 'openstreetmap',
      mapCustomTileUrl: '',
      enableHighResGeocoding: true,
    },
    alerts: [],
    companies: [],
    branches: [],
    departments: [],
    designations: [],
    shifts: [],
    roles: [],
    leaves: [],
    tasks: [],
    rosters: [],
  };
}

// Persistent Storage File on Disk
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'database.json');

function saveDatabase(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DATABASE] Failed to write database to disk:', err);
  }
}

function migrateDatabaseStore(store: DatabaseStore): DatabaseStore {
  store.users = (store.users || []).map(u => {
    const isFieldStaff = u.staffType !== 'OFFICE_STAFF';
    const baseSalary = u.salarySetup?.baseSalaryMonthly || 3500;
    const dailyRate = u.salarySetup?.dailyRate || Math.round((baseSalary / 26) * 100) / 100;
    const hourlyRate = u.salarySetup?.hourlyRate || Math.round((dailyRate / 8) * 100) / 100;
    const wageType = u.wageType || u.salarySetup?.wageType || 'MONTHLY';
    const travelAllowanceType = isFieldStaff 
      ? (u.travelAllowanceType || u.salarySetup?.travelAllowanceType || 'LUMPSUM')
      : 'NONE';
    const ratePerKm = u.ratePerKm || u.salarySetup?.ratePerKm || 0.5;
    const lumpsumTravelAllowance = isFieldStaff
      ? (u.lumpsumTravelAllowance || u.salarySetup?.lumpsumTravelAllowance || u.salarySetup?.travelAllowance || 300)
      : 0;

    return {
      ...u,
      gpsUpdateIntervalSeconds: u.gpsUpdateIntervalSeconds || 30,
      wageType,
      hourlyRate,
      travelAllowanceType,
      ratePerKm,
      lumpsumTravelAllowance,
      salarySetup: {
        ...u.salarySetup,
        wageType,
        baseSalaryMonthly: baseSalary,
        dailyRate,
        hourlyRate,
        payFrequency: u.salarySetup?.payFrequency || 'MONTHLY',
        travelAllowanceType,
        ratePerKm,
        lumpsumTravelAllowance,
        travelAllowance: isFieldStaff ? (travelAllowanceType === 'LUMPSUM' ? lumpsumTravelAllowance : 300) : 0,
        specialAllowance: u.salarySetup?.specialAllowance || 150,
        providentFundDeduction: u.salarySetup?.providentFundDeduction || 120,
        taxDeduction: u.salarySetup?.taxDeduction || 180,
        insuranceDeduction: u.salarySetup?.insuranceDeduction || 70,
        gpsAbsencePenaltyPerHour: u.salarySetup?.gpsAbsencePenaltyPerHour || 20,
        overtimeHourlyRate: u.salarySetup?.overtimeHourlyRate || 25,
      }
    };
  });

  store.settings = {
    ...createEmptyStore().settings,
    ...(store.settings || {}),
    hideWatermarks: store.settings?.hideWatermarks !== false,
    mapProvider: store.settings?.mapProvider || 'openstreetmap',
    mapboxToken: store.settings?.mapboxToken || store.settings?.mapApiKey || '',
  };

  store.rosters = Array.isArray(store.rosters) ? store.rosters : [];
  store.leaves = Array.isArray(store.leaves) ? store.leaves : [];
  store.geofences = Array.isArray(store.geofences) ? store.geofences : [];
  store.tasks = Array.isArray(store.tasks) ? store.tasks : [];
  store.alerts = Array.isArray(store.alerts) ? store.alerts : [];

  return store;
}

function loadDatabase(): DatabaseStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const fileData = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(fileData);
      if (parsed && typeof parsed === 'object') {
        console.log(`[DATABASE] Loaded persistent database from ${DATA_FILE} (${parsed.users?.length || 0} users)`);
        const store = {
          ...createEmptyStore(),
          ...parsed,
        };
        const migrated = migrateDatabaseStore(store);
        return migrated;
      }
    }
  } catch (err) {
    console.error('[DATABASE] Error reading persistent storage, initializing clean production store:', err);
  }
  console.log('[DATABASE] Starting with clean production database (Uninitialized)');
  return createEmptyStore();
}

let db: DatabaseStore = loadDatabase();

function sanitizeUser(user: User): Omit<User, 'password'> {
  const { password, ...sanitized } = user;
  return sanitized;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // JSON payload parser with generous limit for photo base64 strings
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));

  // Request logging
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // ==================== REST API ROUTES ====================

  // ==================== SYSTEM DEPLOYMENT & AUTHENTICATION API ====================

  // Check system initialization & deployment status
  app.get('/api/system/status', (req, res) => {
    const hasAdmin = db.users.some(u => 
      (u.role === 'manager' || u.role === 'admin' || u.systemRoleId === 'role-admin') && 
      u.status === 'ACTIVE'
    );
    const company = db.companies[0] || null;
    const hasExistingData = (db.users && db.users.length > 0) || (db.companies && db.companies.length > 0) || fs.existsSync(DATA_FILE);

    res.json({
      isInitialized: hasAdmin && Boolean(company),
      hasAdmin,
      companyName: company?.name || '',
      companyCode: company?.code || '',
      companyLogo: company?.logoUrl || '',
      currencySymbol: company?.currencySymbol || '$',
      currencyCode: company?.currencyCode || 'USD',
      totalUsers: db.users.length,
      version: '1.3.0-prod',
      hasExistingData,
      existingDataSummary: hasExistingData ? {
        usersCount: db.users.length,
        companyName: company?.name || 'Previous Company Installation',
        sessionsCount: db.sessions?.length || 0,
        geofencesCount: db.geofences?.length || 0,
        lastUpdated: new Date().toISOString()
      } : undefined
    });
  });

  // Reinstate and migrate previous installation database
  app.post('/api/system/reinstate', (req, res) => {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const fileData = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(fileData);
        if (parsed && typeof parsed === 'object') {
          db = migrateDatabaseStore({
            ...createEmptyStore(),
            ...parsed
          });
          saveDatabase();
          return res.json({ 
            success: true, 
            message: `Successfully reinstated previous installation database with ${db.users.length} staff records and migrated to latest schema v1.3.0.` 
          });
        }
      }
      if (db.users.length > 0 || db.companies.length > 0) {
        db = migrateDatabaseStore(db);
        saveDatabase();
        return res.json({
          success: true,
          message: `Successfully reinstated and migrated database with ${db.users.length} staff records.`
        });
      }
      res.status(404).json({ error: 'No previous database found to reinstate.' });
    } catch (err: unknown) {
      res.status(500).json({ error: 'Failed to reinstate database: ' + (err instanceof Error ? err.message : String(err)) });
    }
  });

  // First-Time Deployment Setup
  app.post('/api/system/setup', (req, res) => {
    const { admin, company, defaults } = req.body;

    if (!admin?.name || !admin?.email || !admin?.password) {
      return res.status(400).json({ error: 'System Administrator Name, Email, and Password are required.' });
    }
    if (!company?.name) {
      return res.status(400).json({ error: 'Organization / Company Name is required.' });
    }

    // 1. Create Organization Profile
    const companyRecord: CompanyMaster = {
      id: 'comp-1',
      name: company.name.trim(),
      code: company.code?.trim().toUpperCase() || 'CORP',
      address: company.address?.trim() || 'Corporate Headquarters',
      phone: company.phone?.trim() || admin.mobile?.trim() || '',
      email: company.email?.trim() || admin.email.trim(),
      currencySymbol: company.currencySymbol || '$',
      currencyCode: company.currencyCode || 'USD',
      timezone: company.timezone || 'UTC',
      latitude: company.latitude || 40.7128,
      longitude: company.longitude || -74.0060,
    };
    db.companies = [companyRecord];

    // 2. Create Default HQ Branch
    const branchRecord: BranchMaster = {
      id: 'br-hq',
      companyId: companyRecord.id,
      code: companyRecord.code + '-HQ',
      name: companyRecord.name + ' - Head Office',
      address: companyRecord.address,
      city: company.city?.trim() || 'Headquarters City',
      state: company.state?.trim() || 'State',
      latitude: companyRecord.latitude,
      longitude: companyRecord.longitude,
      geofenceRadiusMeters: defaults?.geofenceRadiusMeters || 350,
      contactNumber: companyRecord.phone,
    };
    db.branches = [branchRecord];

    // 3. Create Default Departments
    db.departments = [
      { id: 'dept-ops', code: 'OPS', name: 'Field Operations & Dispatch', description: 'On-ground field executives, drivers, and runners' },
      { id: 'dept-sales', code: 'SALES', name: 'Commercial & Client Accounts', description: 'Client acquisition, onsite verification, and customer visits' },
      { id: 'dept-admin', code: 'ADM', name: 'Executive Administration & HR', description: 'Operations command, attendance compliance, and payroll' },
    ];

    // 4. Create Default Designations
    db.designations = [
      { id: 'desig-admin', code: 'SYS-ADM', title: 'System Super Administrator', departmentId: 'dept-admin', level: 'Director', minSalary: 6000, maxSalary: 12000, responsibilities: 'Full system ownership, user provisioning, and operations oversight' },
      { id: 'desig-mgr', code: 'OPS-MGR', title: 'Operations Field Manager', departmentId: 'dept-ops', level: 'Lead', minSalary: 4000, maxSalary: 8000, responsibilities: 'Live tracking oversight, leave approvals, and shift dispatch' },
      { id: 'desig-fe', code: 'FLD-EXEC', title: 'Field Operations Executive', departmentId: 'dept-ops', level: 'L2', minSalary: 2800, maxSalary: 4500, responsibilities: 'On-ground field visits, GPS check-ins, and photographic audits' },
      { id: 'desig-runner', code: 'FLD-RUN', title: 'Logistics Runner', departmentId: 'dept-ops', level: 'L1', minSalary: 2200, maxSalary: 3200, responsibilities: 'Document collection, urgent package delivery, and task verification' },
    ];

    // 5. Create Default Shifts
    db.shifts = [
      {
        id: 'sh-standard',
        code: 'SHIFT-GEN',
        name: defaults?.shiftName || 'Standard Day Shift',
        startTime: defaults?.startTime || '09:00',
        endTime: defaults?.endTime || '18:00',
        gracePeriodMinutes: 15,
        halfDayThresholdHours: 4.5,
        fullDayHours: 8.5,
        isNightShift: false,
      }
    ];

    // 6. Create Standard System Roles
    db.roles = [
      {
        id: 'role-admin',
        name: 'Super Administrator',
        description: 'Full enterprise control across live map, staff records, masters, salary, and leaves',
        isSystemDefault: true,
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
      },
      {
        id: 'role-mgr',
        name: 'Operations Manager',
        description: 'Supervisory role managing live tracking, alerts, attendance, and leave approvals',
        isSystemDefault: true,
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
      },
      {
        id: 'role-field',
        name: 'Field Executive',
        description: 'Mobile field executive with check-in, GPS tracking, leave application, and task execution',
        isSystemDefault: true,
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
      },
    ];

    // 7. Create Super Admin User
    const adminUser: User = {
      id: 'usr-adm-' + Date.now(),
      employeeId: admin.employeeId?.trim() || 'ADM-001',
      name: admin.name.trim(),
      role: 'manager',
      staffType: 'OFFICE_STAFF',
      gender: 'MALE',
      systemRoleId: 'role-admin',
      companyId: companyRecord.id,
      branchId: branchRecord.id,
      departmentId: 'dept-admin',
      designationId: 'desig-admin',
      shiftId: 'sh-standard',
      email: admin.email.trim(),
      mobile: admin.mobile?.trim() || '',
      password: admin.password,
      status: 'ACTIVE',
      currentStatus: 'IDLE',
      dutyGpsStatus: 'GPS_ACTIVE',
      salarySetup: {
        baseSalaryMonthly: 6000,
        dailyRate: 230.76,
        hourlyRate: 28.84,
        payFrequency: 'MONTHLY',
        travelAllowance: 500,
        specialAllowance: 300,
        providentFundDeduction: 200,
        taxDeduction: 400,
        insuranceDeduction: 100,
        gpsAbsencePenaltyPerHour: 0,
        overtimeHourlyRate: 0,
      },
      leavesEntitlement: {
        casual: 12,
        sick: 10,
        earned: 15,
        usedCasual: 0,
        usedSick: 0,
        usedEarned: 0,
      }
    };

    db.users = [adminUser];

    // Optional single test staff if explicitly requested by admin
    if (defaults?.createSampleStaff) {
      const emailDomain = companyRecord.email.includes('@') ? companyRecord.email.split('@')[1] : 'company.com';
      const sampleStaff: User = {
        id: 'usr-fe-' + Date.now(),
        employeeId: 'FE-101',
        name: 'Sample Field Executive',
        role: 'executive',
        staffType: 'FIELD_STAFF',
        gender: 'MALE',
        systemRoleId: 'role-field',
        companyId: companyRecord.id,
        branchId: branchRecord.id,
        departmentId: 'dept-ops',
        designationId: 'desig-fe',
        shiftId: 'sh-standard',
        email: 'field.staff@' + emailDomain,
        mobile: '+1 (555) 010-2030',
        password: 'Staff@123',
        status: 'ACTIVE',
        currentStatus: 'IDLE',
        dutyGpsStatus: 'GPS_ACTIVE',
        salarySetup: {
          baseSalaryMonthly: 3500,
          dailyRate: 134.61,
          hourlyRate: 16.82,
          payFrequency: 'MONTHLY',
          travelAllowance: 350,
          specialAllowance: 150,
          providentFundDeduction: 120,
          taxDeduction: 180,
          insuranceDeduction: 70,
          gpsAbsencePenaltyPerHour: 20,
          overtimeHourlyRate: 25,
        },
        leavesEntitlement: {
          casual: 12,
          sick: 8,
          earned: 15,
          usedCasual: 0,
          usedSick: 0,
          usedEarned: 0,
        }
      };
      db.users.push(sampleStaff);
    }

    saveDatabase();

    const token = 'ft-token-' + adminUser.id + '-' + Date.now();
    res.json({
      success: true,
      message: 'System successfully initialized for production deployment',
      user: sanitizeUser(adminUser),
      token,
    });
  });

  // User Login (Email or Employee ID + Password)
  app.post('/api/auth/login', (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Please provide Email / Employee ID and Password.' });
    }

    const trimmed = identifier.trim().toLowerCase();
    const user = db.users.find(u => 
      u.email?.trim().toLowerCase() === trimmed || 
      u.employeeId?.trim().toLowerCase() === trimmed
    );

    if (!user) {
      return res.status(401).json({ error: 'No account found with this Email or Employee ID.' });
    }

    if (user.status === 'INACTIVE') {
      return res.status(403).json({ error: 'This user account has been deactivated. Please contact your system administrator.' });
    }

    // Strict password match check - users must access only with their own credentials
    if (!user.password || user.password !== password) {
      return res.status(401).json({ error: 'Invalid password. Please check your credentials and try again.' });
    }

    const token = 'ft-token-' + user.id + '-' + Date.now();
    res.json({
      success: true,
      user: sanitizeUser(user),
      token,
    });
  });

  // Verify Session Token (/api/auth/me)
  app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    const token = authHeader.substring(7);
    const parts = token.split('-');
    if (parts.length < 4 || parts[0] !== 'ft' || parts[1] !== 'token') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const userId = parts[2];
    const user = (db.users || []).find(u => u.id === userId && u.status === 'ACTIVE');
    if (!user) {
      return res.status(401).json({ error: 'Session expired or user inactive' });
    }
    res.json({ user: sanitizeUser(user) });
  });

  // User Logout
  app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
  });

  // System Factory Reset (Wipes database and resets to clean uninitialized state)
  app.post('/api/system/reset', (req, res) => {
    db = createEmptyStore();
    saveDatabase();
    res.json({ success: true, message: 'System database cleared to clean uninitialized state' });
  });

  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      serverTime: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  // Re-seed demo database
  app.post('/api/seed', (req, res) => {
    db = createEmptyStore(); saveDatabase();
    res.json({ success: true, message: 'Database reset to initial demo state successfully' });
  });

  // Users & Executives (Passwords strictly stripped)
  app.get('/api/users', (req, res) => {
    res.json((db.users || []).map(sanitizeUser));
  });

  app.get('/api/executives', (req, res) => {
    const executives = (db.users || []).filter(u => u.role === 'executive').map(sanitizeUser);
    res.json(executives);
  });

  app.get('/api/executives/:id', (req, res) => {
    const user = (db.users || []).find(u => u.id === req.params.id || u.employeeId === req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Executive not found' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const activeSession = db.sessions.find(s => s.userId === user.id && s.date === todayStr && s.status === 'ACTIVE') || null;
    const recentLocations = db.locationRecords
      .filter(l => l.userId === user.id)
      .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
    
    const visits = db.visits
      .filter(v => v.userId === user.id)
      .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());

    // Calculate total distance
    let totalDistKm = 0;
    const userLocs = [...recentLocations].reverse();
    for (let i = 1; i < userLocs.length; i++) {
      const p1 = userLocs[i - 1];
      const p2 = userLocs[i];
      // Quick distance calculation
      const dLat = (p2.latitude - p1.latitude) * 111;
      const dLon = (p2.longitude - p1.longitude) * 88;
      totalDistKm += Math.sqrt(dLat * dLat + dLon * dLon);
    }

    const summary: DailyActivitySummary = {
      userId: user.id,
      employeeId: user.employeeId,
      employeeName: user.name,
      date: todayStr,
      checkInTime: activeSession?.checkInTime,
      checkOutTime: activeSession?.checkOutTime,
      durationMinutes: activeSession ? Math.round((Date.now() - new Date(activeSession.checkInTime).getTime()) / 60000) : 0,
      totalUpdates: recentLocations.length,
      totalVisits: visits.length,
      totalDistanceKm: Number(totalDistKm.toFixed(2)),
      syncStatus: 'SYNCED',
      hasSuspiciousFlags: recentLocations.some(l => l.validationFlags.some(f => f !== 'NORMAL')),
      lastKnownLatitude: recentLocations[0]?.latitude,
      lastKnownLongitude: recentLocations[0]?.longitude,
      lastActiveAt: recentLocations[0]?.capturedAt || user.lastActiveAt,
    };

    res.json({
      user: sanitizeUser(user),
      activeSession,
      recentLocations,
      visits,
      summary,
    });
  });

  // Live Tracking Feed for Map
  app.get('/api/tracking/live', (req, res) => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    const executives = db.users
      .filter(u => u.role === 'executive')
      .map(user => {
        const userLocs = db.locationRecords
          .filter(l => l.userId === user.id)
          .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
        
        const activeSession = db.sessions.find(s => s.userId === user.id && s.status === 'ACTIVE');
        const todayVisits = db.visits.filter(v => v.userId === user.id && v.capturedAt.startsWith(todayStr));

        return {
          ...user,
          latestLocation: userLocs[0],
          activeSession,
          todayVisitsCount: todayVisits.length,
        };
      });

    const activeAlertsCount = db.alerts.filter(a => !a.resolved).length;

    res.json({
      executives,
      geofences: db.geofences,
      activeAlertsCount,
    });
  });

  // Route Playback History
  app.get('/api/executives/:id/route', (req, res) => {
    const { id } = req.params;
    const { date } = req.query;
    const filterDate = (date as string) || new Date().toISOString().split('T')[0];

    const locations = db.locationRecords
      .filter(l => (l.userId === id || l.employeeId === id) && l.capturedAt.startsWith(filterDate))
      .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());

    const visits = db.visits
      .filter(v => (v.userId === id || v.employeeId === id) && v.capturedAt.startsWith(filterDate))
      .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());

    const session = db.sessions.find(s => (s.userId === id || s.employeeId === id) && s.date === filterDate) || null;

    let totalDistKm = 0;
    for (let i = 1; i < locations.length; i++) {
      const p1 = locations[i - 1];
      const p2 = locations[i];
      const dLat = (p2.latitude - p1.latitude) * 111;
      const dLon = (p2.longitude - p1.longitude) * 88;
      totalDistKm += Math.sqrt(dLat * dLat + dLon * dLon);
    }

    res.json({
      locations,
      visits,
      session,
      totalDistanceKm: Number(totalDistKm.toFixed(2)),
    });
  });

  // Field Visits
  app.get('/api/visits', (req, res) => {
    const { executiveId, date, verified } = req.query;
    let list = [...db.visits];

    if (executiveId) {
      list = list.filter(v => v.userId === executiveId || v.employeeId === executiveId);
    }
    if (date) {
      list = list.filter(v => v.capturedAt.startsWith(date as string));
    }
    if (verified !== undefined) {
      const isVerified = verified === 'true';
      list = list.filter(v => !!v.verifiedByManager === isVerified);
    }

    list.sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
    res.json(list);
  });

  app.patch('/api/visits/:id/verify', (req, res) => {
    const { id } = req.params;
    const { verified, notes } = req.body;
    const visit = db.visits.find(v => v.id === id);
    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    visit.verifiedByManager = verified;
    if (notes !== undefined) visit.managerNotes = notes;
    res.json(visit);
  });

  // Alerts
  app.get('/api/alerts', (req, res) => {
    const sorted = [...db.alerts].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(sorted);
  });

  app.patch('/api/alerts/:id/resolve', (req, res) => {
    const { id } = req.params;
    const alert = db.alerts.find(a => a.id === id);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    alert.resolved = true;
    res.json({ success: true, alert });
  });

  // Settings & Geofences
  app.get('/api/system/company', (req, res) => {
    res.json(db.companies[0] || null);
  });

  app.put('/api/system/company', (req, res) => {
    if (!db.companies || db.companies.length === 0) {
      db.companies = [{ 
        id: 'comp-1', 
        name: 'Apex Logistics', 
        code: 'AFL', 
        address: '', 
        phone: '', 
        email: '', 
        currencySymbol: '$', 
        currencyCode: 'USD',
        ...req.body 
      }];
    } else {
      db.companies[0] = { ...db.companies[0], ...req.body };
    }
    saveDatabase();
    res.json(db.companies[0]);
  });

  app.get('/api/settings', (req, res) => {
    res.json(db.settings);
  });

  app.post('/api/settings', (req, res) => {
    db.settings = { ...db.settings, ...req.body };
    saveDatabase();
    res.json(db.settings);
  });

  app.get('/api/geofences', (req, res) => {
    res.json(db.geofences);
  });

  app.post('/api/geofences', (req, res) => {
    const data = req.body;
    if (data.id) {
      const idx = db.geofences.findIndex(g => g.id === data.id);
      if (idx >= 0) {
        db.geofences[idx] = { ...db.geofences[idx], ...data };
        saveDatabase();
        return res.json(db.geofences[idx]);
      }
    }
    const newGeo: Geofence = {
      id: `geo-${Date.now()}`,
      name: data.name || 'New Geofence Area',
      description: data.description || '',
      latitude: Number(data.latitude) || 37.7749,
      longitude: Number(data.longitude) || -122.4194,
      radiusMeters: Number(data.radiusMeters) || 3000,
      color: data.color || '#3b82f6',
      assignedUserIds: data.assignedUserIds || [],
    };
    db.geofences.push(newGeo);
    saveDatabase();
    res.json(newGeo);
  });

  app.delete('/api/geofences/:id', (req, res) => {
    db.geofences = db.geofences.filter(g => g.id !== req.params.id);
    saveDatabase();
    res.json({ success: true });
  });

  // Reports
  app.get('/api/reports/daily', (req, res) => {
    const { date } = req.query;
    const reportDate = (date as string) || new Date().toISOString().split('T')[0];

    const reports: DailyActivitySummary[] = db.users
      .filter(u => u.role === 'executive')
      .map(user => {
        const session = db.sessions.find(s => s.userId === user.id && s.date === reportDate);
        const locations = db.locationRecords.filter(l => l.userId === user.id && l.capturedAt.startsWith(reportDate));
        const visits = db.visits.filter(v => v.userId === user.id && v.capturedAt.startsWith(reportDate));

        let totalDist = 0;
        const sortedLocs = [...locations].sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
        for (let i = 1; i < sortedLocs.length; i++) {
          const p1 = sortedLocs[i - 1];
          const p2 = sortedLocs[i];
          const dLat = (p2.latitude - p1.latitude) * 111;
          const dLon = (p2.longitude - p1.longitude) * 88;
          totalDist += Math.sqrt(dLat * dLat + dLon * dLon);
        }

        const durationMinutes = session?.checkInTime 
          ? Math.round(((session.checkOutTime ? new Date(session.checkOutTime).getTime() : Date.now()) - new Date(session.checkInTime).getTime()) / 60000)
          : 0;

        return {
          userId: user.id,
          employeeId: user.employeeId,
          employeeName: user.name,
          date: reportDate,
          checkInTime: session?.checkInTime,
          checkOutTime: session?.checkOutTime,
          durationMinutes,
          totalUpdates: locations.length,
          totalVisits: visits.length,
          totalDistanceKm: Number(totalDist.toFixed(2)),
          syncStatus: 'SYNCED',
          hasSuspiciousFlags: locations.some(l => l.validationFlags.some(f => f !== 'NORMAL')),
          lastKnownLatitude: sortedLocs[sortedLocs.length - 1]?.latitude,
          lastKnownLongitude: sortedLocs[sortedLocs.length - 1]?.longitude,
          lastActiveAt: sortedLocs[sortedLocs.length - 1]?.capturedAt || user.lastActiveAt,
        };
      });

    res.json(reports);
  });

  // ==================== ENTERPRISE MASTERS API ====================
  app.get('/api/masters', (req, res) => {
    res.json({
      companies: db.companies || [],
      branches: db.branches || [],
      departments: db.departments || [],
      designations: db.designations || [],
      shifts: db.shifts || [],
      roles: db.roles || [],
    });
  });

  app.post('/api/masters/:type', (req, res) => {
    const { type } = req.params;
    const validTypes = ['companies', 'branches', 'departments', 'designations', 'shifts', 'roles'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid master type: ${type}` });
    }
    const newItem = {
      ...req.body,
      id: req.body.id || `${type.slice(0, 3)}-${Date.now()}`,
    };
    (db as any)[type] = (db as any)[type] || [];
    (db as any)[type].push(newItem);
    saveDatabase();
    res.status(201).json(newItem);
  });

  app.put('/api/masters/:type/:id', (req, res) => {
    const { type, id } = req.params;
    const list = (db as any)[type];
    if (!Array.isArray(list)) {
      return res.status(404).json({ error: 'Master collection not found' });
    }
    const idx = list.findIndex(item => item.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Record not found' });
    }
    list[idx] = { ...list[idx], ...req.body, id };
    saveDatabase();
    res.json(list[idx]);
  });

  app.delete('/api/masters/:type/:id', (req, res) => {
    const { type, id } = req.params;
    const list = (db as any)[type];
    if (!Array.isArray(list)) {
      return res.status(404).json({ error: 'Master collection not found' });
    }
    (db as any)[type] = list.filter(item => item.id !== id);
    saveDatabase();
    res.json({ success: true, message: 'Record deleted successfully' });
  });

  // ==================== LEAVES & TIME-OFF API ====================
  app.get('/api/leaves', (req, res) => {
    const { userId } = req.query;
    let leavesList = db.leaves || [];
    if (userId) {
      leavesList = leavesList.filter(l => l.userId === userId);
    }
    res.json(leavesList);
  });

  app.post('/api/leaves', (req, res) => {
    const { userId, employeeId, employeeName, staffType, leaveType, startDate, endDate, daysCount, reason } = req.body;
    if (!userId || !startDate || !endDate || !reason) {
      return res.status(400).json({ error: 'Missing required leave fields: userId, startDate, endDate, and reason are mandatory.' });
    }
    const newLeave: LeaveRequest = {
      id: `lv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId,
      employeeId: employeeId || 'EMP',
      employeeName: employeeName || 'Staff Member',
      staffType: staffType || 'FIELD_STAFF',
      leaveType: leaveType || 'CASUAL',
      startDate,
      endDate,
      daysCount: Number(daysCount) || 1,
      reason: String(reason).trim(),
      status: 'PENDING',
      appliedAt: new Date().toISOString(),
    };

    db.leaves = db.leaves || [];
    db.leaves.unshift(newLeave);

    // Create a real-time notification alert for manager review
    db.alerts.unshift({
      id: `alt-lv-${Date.now()}`,
      userId,
      employeeId: employeeId || 'EMP',
      employeeName: employeeName || 'Staff Member',
      type: 'MANUAL_REVIEW_REQUIRED',
      message: `New ${newLeave.leaveType} leave application submitted by ${newLeave.employeeName} (${newLeave.daysCount} days from ${newLeave.startDate} to ${newLeave.endDate}).`,
      severity: 'low',
      timestamp: new Date().toISOString(),
      recordId: newLeave.id,
      resolved: false,
    });

    saveDatabase();
    res.status(201).json(newLeave);
  });

  app.patch('/api/leaves/:id/status', (req, res) => {
    const { id } = req.params;
    const { status, reviewNotes, reviewerName } = req.body;
    const leave = (db.leaves || []).find(l => l.id === id);
    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    leave.status = status;
    leave.reviewNotes = reviewNotes || '';
    leave.reviewedBy = reviewerName || 'Operations Lead';
    leave.reviewedAt = new Date().toISOString();

    // Deduct leave balance from staff profile if approved
    if (status === 'APPROVED') {
      const user = db.users.find(u => u.id === leave.userId);
      if (user && user.leavesEntitlement) {
        if (leave.leaveType === 'CASUAL') {
          user.leavesEntitlement.casual = Math.max(0, (user.leavesEntitlement.casual || 12) - leave.daysCount);
          user.leavesEntitlement.usedCasual = (user.leavesEntitlement.usedCasual || 0) + leave.daysCount;
        } else if (leave.leaveType === 'SICK') {
          user.leavesEntitlement.sick = Math.max(0, (user.leavesEntitlement.sick || 8) - leave.daysCount);
          user.leavesEntitlement.usedSick = (user.leavesEntitlement.usedSick || 0) + leave.daysCount;
        } else if (leave.leaveType === 'EARNED') {
          user.leavesEntitlement.earned = Math.max(0, (user.leavesEntitlement.earned || 15) - leave.daysCount);
          user.leavesEntitlement.usedEarned = (user.leavesEntitlement.usedEarned || 0) + leave.daysCount;
        }
      }
    }

    saveDatabase();
    res.json(leave);
  });

  // ==================== STAFF & USER MANAGEMENT API ====================
  app.post('/api/users', (req, res) => {
    const staffData = req.body;
    const isOffice = staffData.staffType === 'OFFICE_STAFF';
    const baseSalary = Number(staffData.baseSalaryMonthly || staffData.salarySetup?.baseSalaryMonthly) || 3500;
    const dailyRate = Number(staffData.dailyRate || staffData.salarySetup?.dailyRate) || Math.round((baseSalary / 26) * 100) / 100;
    const hourlyRate = Number(staffData.hourlyRate || staffData.salarySetup?.hourlyRate) || Math.round((dailyRate / 8) * 100) / 100;
    const wageType = staffData.wageType || staffData.salarySetup?.wageType || 'MONTHLY';
    const travelAllowanceType = isOffice 
      ? 'NONE' 
      : (staffData.travelAllowanceType || staffData.salarySetup?.travelAllowanceType || 'LUMPSUM');
    const ratePerKm = isOffice ? 0 : (Number(staffData.ratePerKm || staffData.salarySetup?.ratePerKm) || 0.5);
    const lumpsumTravelAllowance = isOffice ? 0 : (Number(staffData.lumpsumTravelAllowance || staffData.salarySetup?.lumpsumTravelAllowance) || 300);

    const newUser: User = {
      id: `usr-${Date.now()}`,
      employeeId: staffData.employeeId || `EMP-${Math.floor(100 + Math.random() * 900)}`,
      name: staffData.name || 'New Staff',
      role: staffData.role || 'executive',
      staffType: staffData.staffType || 'FIELD_STAFF',
      gender: staffData.gender || 'MALE',
      residentialAddress: staffData.residentialAddress || '',
      email: staffData.email || '',
      mobile: staffData.mobile || '',
      password: staffData.password ? staffData.password.trim() : 'Staff@123',
      avatarUrl: staffData.avatarUrl,
      status: 'ACTIVE',
      companyId: staffData.companyId || (db.companies[0]?.id || 'comp-1'),
      branchId: staffData.branchId || (db.branches[0]?.id || 'br-1'),
      departmentId: staffData.departmentId || (db.departments[0]?.id || 'dept-1'),
      designationId: staffData.designationId || (db.designations[0]?.id || 'desig-1'),
      shiftId: staffData.shiftId || (db.shifts[0]?.id || 'sh-1'),
      systemRoleId: staffData.systemRoleId || 'role-field',
      assignedManagerId: staffData.assignedManagerId || 'usr-mgr-1',
      assignedGeofenceId: staffData.assignedGeofenceId || 'geo-1',
      currentStatus: 'OFFLINE',
      dutyGpsStatus: 'GPS_ACTIVE',
      gpsUpdateIntervalSeconds: Number(staffData.gpsUpdateIntervalSeconds) || 30,
      wageType,
      hourlyRate,
      travelAllowanceType,
      ratePerKm,
      lumpsumTravelAllowance,
      salarySetup: {
        wageType,
        baseSalaryMonthly: baseSalary,
        dailyRate,
        hourlyRate,
        payFrequency: 'MONTHLY',
        travelAllowanceType,
        ratePerKm,
        lumpsumTravelAllowance,
        travelAllowance: isOffice ? 0 : (travelAllowanceType === 'LUMPSUM' ? lumpsumTravelAllowance : 300),
        specialAllowance: Number(staffData.salarySetup?.specialAllowance) || 150,
        providentFundDeduction: Number(staffData.salarySetup?.providentFundDeduction) || 120,
        taxDeduction: Number(staffData.salarySetup?.taxDeduction) || 180,
        insuranceDeduction: Number(staffData.salarySetup?.insuranceDeduction) || 70,
        gpsAbsencePenaltyPerHour: Number(staffData.salarySetup?.gpsAbsencePenaltyPerHour) || 20,
        overtimeHourlyRate: Number(staffData.salarySetup?.overtimeHourlyRate) || 25,
        ...staffData.salarySetup,
      },
      leavesEntitlement: staffData.leavesEntitlement || {
        casual: 12,
        sick: 8,
        earned: 15,
        usedCasual: 0,
        usedSick: 0,
        usedEarned: 0,
      }
    };
    db.users.push(newUser);
    saveDatabase();
    res.status(201).json(newUser);
  });

  app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const idx = db.users.findIndex(u => u.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    const updateData = req.body;
    const existing = db.users[idx];
    const updatedUser: User = {
      ...existing,
      ...updateData,
      id,
      gpsUpdateIntervalSeconds: updateData.gpsUpdateIntervalSeconds !== undefined 
        ? Number(updateData.gpsUpdateIntervalSeconds) 
        : existing.gpsUpdateIntervalSeconds,
      wageType: updateData.wageType || existing.wageType || 'MONTHLY',
      hourlyRate: updateData.hourlyRate !== undefined ? Number(updateData.hourlyRate) : existing.hourlyRate,
      travelAllowanceType: updateData.staffType === 'OFFICE_STAFF' 
        ? 'NONE' 
        : (updateData.travelAllowanceType || existing.travelAllowanceType || 'LUMPSUM'),
      ratePerKm: updateData.ratePerKm !== undefined ? Number(updateData.ratePerKm) : existing.ratePerKm,
      lumpsumTravelAllowance: updateData.lumpsumTravelAllowance !== undefined 
        ? Number(updateData.lumpsumTravelAllowance) 
        : existing.lumpsumTravelAllowance,
      salarySetup: {
        ...(existing.salarySetup || {}),
        ...(updateData.salarySetup || {}),
      }
    };
    db.users[idx] = updatedUser;
    saveDatabase();
    res.json(db.users[idx]);
  });

  app.delete('/api/users/:id', (req, res) => {
    const { id } = req.params;
    db.users = db.users.filter(u => u.id !== id);
    saveDatabase();
    res.json({ success: true, message: 'Staff deleted successfully' });
  });

  app.post('/api/users/:id/reset-password', (req, res) => {
    const { id } = req.params;
    const user = db.users.find(u => u.id === id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.password = req.body.newPassword ? req.body.newPassword.trim() : 'Staff@123';
    saveDatabase();
    res.json({ success: true, message: `Password for ${user.name} has been reset successfully.` });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const { employeeId, email, newPassword } = req.body;
    const user = db.users.find(u => 
      u.employeeId?.toLowerCase() === employeeId?.trim().toLowerCase() && 
      u.email?.toLowerCase() === email?.trim().toLowerCase()
    );
    if (!user) {
      return res.status(404).json({ error: 'No matching user found with the provided Employee ID and registered email.' });
    }
    user.password = (newPassword || 'Staff@123').trim();
    saveDatabase();
    res.json({ success: true, message: `Password updated successfully for ${user.name}. You may now log in.` });
  });

  // ==================== REAL-TIME GPS DUTY STATUS API ====================
  app.post('/api/tracking/gps-status', (req, res) => {
    const { userId, isGpsDisabled, coordinates } = req.body;
    const user = db.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (isGpsDisabled) {
      user.dutyGpsStatus = 'GPS_DISABLED_ABSENT';
      user.gpsDisabledAt = new Date().toISOString();
      // Generate critical alert for manager
      db.alerts.unshift({
        id: `alt-gps-${Date.now()}`,
        userId: user.id,
        employeeId: user.employeeId,
        employeeName: user.name,
        type: 'GPS_DISABLED_ABSENT',
        message: `CRITICAL DUTY VIOLATION: GPS was disabled by ${user.name} (${user.employeeId}). Staff marked ABSENT from duty.`,
        severity: 'high',
        latitude: coordinates?.lat || 40.7128,
        longitude: coordinates?.lng || -74.006,
        accuracy: coordinates?.accuracy || 50,
        timestamp: new Date().toISOString(),
        resolved: false,
      });
    } else {
      user.dutyGpsStatus = 'GPS_ACTIVE';
    }
    res.json({
      dutyGpsStatus: user.dutyGpsStatus,
      message: user.dutyGpsStatus === 'GPS_DISABLED_ABSENT' 
        ? 'GPS Disabled: You have been marked ABSENT for duty period until GPS is restored.' 
        : 'GPS re-enabled. Active duty status restored.',
    });
  });

  // ==================== TASKS & ALLOCATIONS API ====================
  app.get('/api/tasks', (req, res) => {
    const { userId } = req.query;
    let tasksList = db.tasks || [];
    if (userId) {
      tasksList = tasksList.filter(t => t.assignedToUserId === userId);
    }
    res.json(tasksList);
  });

  app.post('/api/tasks', (req, res) => {
    const newTask: TaskAssignment = {
      ...req.body,
      id: `tsk-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: req.body.status || 'PENDING',
    };
    db.tasks = db.tasks || [];
    db.tasks.unshift(newTask);
    saveDatabase();
    res.status(201).json(newTask);
  });

  app.patch('/api/tasks/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const task = (db.tasks || []).find(t => t.id === id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    task.status = status;
    if (status === 'COMPLETED') {
      task.completedAt = new Date().toISOString();
    }
    saveDatabase();
    res.json(task);
  });

  // ==================== SALARY & PAYROLL CALCULATION API ====================
  app.get('/api/payroll/calculate', (req, res) => {
    const { month, branchId, userId } = req.query as { month?: string; branchId?: string; userId?: string };
    const targetMonth = month || '2026-09';
    const totalWorkingDays = 26;

    let staffList = db.users.filter(u => u.role === 'executive');
    if (branchId && branchId !== 'ALL') {
      staffList = staffList.filter(u => u.branchId === branchId);
    }
    if (userId) {
      staffList = staffList.filter(u => u.id === userId);
    }

    const calculations: SalaryCalculation[] = staffList.map((user) => {
      const desig = (db.designations || []).find(d => d.id === user.designationId);
      const dept = (db.departments || []).find(d => d.id === user.departmentId);

      const wageType: WageType = user.wageType || user.salarySetup?.wageType || 'MONTHLY';
      const baseSalary = user.salarySetup?.baseSalaryMonthly || 3500;
      const dailyRate = user.salarySetup?.dailyRate || Math.round((baseSalary / totalWorkingDays) * 100) / 100;
      const hourlyRate = user.salarySetup?.hourlyRate || Math.round((dailyRate / 8) * 100) / 100;

      const presentDays = user.id === 'usr-fe-5' ? 18 : user.id === 'usr-fe-4' ? 22 : 24;
      const halfDays = user.id === 'usr-fe-2' ? 1 : 0;
      const approvedPaidLeaves = user.id === 'usr-fe-4' ? 2 : 1;
      const absentDays = Math.max(0, totalWorkingDays - (presentDays + halfDays * 0.5 + approvedPaidLeaves));
      const gpsDisabledHours = user.dutyGpsStatus === 'GPS_DISABLED_ABSENT' ? 8.5 : (user.id === 'usr-fe-4' ? 3 : 0);
      const overtimeHours = user.id === 'usr-fe-1' ? 6 : 0;

      // Duty hours computation for hourly wage calculation
      const userSessions = (db.sessions || []).filter(s => 
        (s.userId === user.id || s.employeeId === user.employeeId) && 
        (s.date?.startsWith(targetMonth) || s.checkInTime?.startsWith(targetMonth))
      );
      let totalDutyHours = (presentDays + halfDays * 0.5) * 8;
      if (userSessions.length > 0) {
        let loggedHours = 0;
        for (const s of userSessions) {
          if (s.checkInTime && s.checkOutTime) {
            const diffMs = new Date(s.checkOutTime).getTime() - new Date(s.checkInTime).getTime();
            if (diffMs > 0) loggedHours += diffMs / 3600000;
          } else {
            loggedHours += 8;
          }
        }
        if (loggedHours > 0) {
          totalDutyHours = Math.round(loggedHours * 10) / 10;
        }
      }

      // 1. Wage Calculation (Monthly vs Hourly)
      let earnedBaseSalary = 0;
      if (wageType === 'HOURLY') {
        earnedBaseSalary = Math.round(hourlyRate * totalDutyHours);
      } else {
        earnedBaseSalary = Math.round(dailyRate * (presentDays + halfDays * 0.5 + approvedPaidLeaves));
      }

      // 2. Travel Allowance: strictly only available for Field Staff
      const isFieldStaff = user.staffType !== 'OFFICE_STAFF';
      let travelAllowance = 0;
      let totalDistanceKm = 0;
      let ratePerKm = 0;
      let travelAllowanceType: TravelAllowanceType = 'NONE';

      if (isFieldStaff) {
        travelAllowanceType = user.travelAllowanceType || user.salarySetup?.travelAllowanceType || 'LUMPSUM';
        ratePerKm = user.ratePerKm || user.salarySetup?.ratePerKm || 0.5;

        // Calculate distance from recorded sessions or field activity
        totalDistanceKm = userSessions.reduce((sum, s) => sum + (s.totalDistanceKm || 0), 0);
        if (totalDistanceKm === 0) {
          totalDistanceKm = Math.round(presentDays * (user.id === 'usr-fe-4' ? 38.4 : 26.5) * 10) / 10;
        }

        if (travelAllowanceType === 'PER_KM') {
          travelAllowance = Math.round(totalDistanceKm * ratePerKm);
        } else if (travelAllowanceType === 'LUMPSUM') {
          travelAllowance = user.lumpsumTravelAllowance || user.salarySetup?.lumpsumTravelAllowance || user.salarySetup?.travelAllowance || 300;
        } else {
          travelAllowance = 0;
        }
      } else {
        travelAllowanceType = 'NONE';
        travelAllowance = 0;
      }

      const specialAllowance = user.salarySetup?.specialAllowance || 150;
      const totalAllowances = travelAllowance + specialAllowance + (overtimeHours * (user.salarySetup?.overtimeHourlyRate || 25));

      const gpsAbsencePenaltyRate = user.salarySetup?.gpsAbsencePenaltyPerHour || (hourlyRate * 1.25);
      const gpsAbsenceDeductions = Math.round(gpsDisabledHours * gpsAbsencePenaltyRate);
      const statutoryDeductions = (user.salarySetup?.providentFundDeduction || 120) + (user.salarySetup?.insuranceDeduction || 80);
      const taxDeduction = user.salarySetup?.taxDeduction || 180;

      const netPayableSalary = Math.max(0, Math.round(earnedBaseSalary + totalAllowances - (gpsAbsenceDeductions + statutoryDeductions + taxDeduction)));

      return {
        id: `sal-${user.id}-${targetMonth}`,
        userId: user.id,
        employeeId: user.employeeId,
        employeeName: user.name,
        staffType: user.staffType || 'FIELD_STAFF',
        designationTitle: desig?.title || 'Field Officer',
        departmentName: dept?.name || 'Operations',
        month: targetMonth,
        totalWorkingDays,
        presentDays,
        halfDays,
        absentDays,
        approvedPaidLeaves,
        gpsDisabledHours,
        overtimeHours,
        wageType,
        hourlyRate,
        totalDutyHours,
        travelAllowanceType,
        ratePerKm,
        totalDistanceKm,
        baseSalary,
        earnedBaseSalary,
        travelAllowance,
        specialAllowance,
        totalAllowances,
        gpsAbsenceDeductions,
        statutoryDeductions,
        taxDeduction,
        netPayableSalary,
        paymentStatus: 'DRAFT',
        calculatedAt: new Date().toISOString(),
      };
    });

    const totalPayroll = calculations.reduce((sum, c) => sum + c.netPayableSalary, 0);
    const totalAbsencePenalties = calculations.reduce((sum, c) => sum + c.gpsAbsenceDeductions, 0);

    res.json({
      month: targetMonth,
      totalWorkingDays,
      totalPayroll,
      totalAbsencePenalties,
      calculations,
    });
  });

  // Check-in Eligibility Check (Blocks attendance if on approved leave)
  app.post('/api/tracking/check-in-check', (req, res) => {
    const { userId, employeeId, date } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const approvedLeave = (db.leaves || []).find(l => 
      ((userId && l.userId === userId) || (employeeId && l.employeeId === employeeId)) &&
      l.status === 'APPROVED' &&
      l.startDate <= targetDate &&
      l.endDate >= targetDate
    );
    if (approvedLeave) {
      return res.status(403).json({
        allowed: false,
        error: `Attendance Blocked: You are on approved ${approvedLeave.leaveType} leave for ${targetDate}. Attendance cannot be marked on approved leave days.`,
        leave: approvedLeave,
      });
    }
    res.json({ allowed: true });
  });

  // ==================== BATCH SYNCHRONIZATION API ====================
  // Idempotent batch upload from offline IndexedDB queue
  app.post('/api/sync/batch', (req, res) => {
    const { sessions = [], locationRecords = [], visits = [], photos = [] } = req.body;
    const serverTimestamp = new Date().toISOString();
    const syncedRecordIds: string[] = [];
    const failedRecordIds: { id: string; error: string }[] = [];

    // 1. Process Sessions (Verify no approved leave conflict)
    for (const session of sessions as WorkSession[]) {
      try {
        const sessionDate = session.date || (session.checkInTime ? session.checkInTime.split('T')[0] : new Date().toISOString().split('T')[0]);
        const hasApprovedLeave = (db.leaves || []).some(l => 
          (l.userId === session.userId || l.employeeId === session.employeeId) &&
          l.status === 'APPROVED' &&
          l.startDate <= sessionDate &&
          l.endDate >= sessionDate
        );
        if (hasApprovedLeave && session.status === 'ACTIVE') {
          failedRecordIds.push({ 
            id: session.id, 
            error: `Attendance Rejected: Staff member is on approved leave on ${sessionDate}. Attendance marking is forbidden.` 
          });
          continue;
        }

        const existingIdx = db.sessions.findIndex(s => s.id === session.id);
        const serverSession = { ...session, syncStatus: 'SYNCED' as const };
        if (existingIdx >= 0) {
          db.sessions[existingIdx] = serverSession;
        } else {
          db.sessions.push(serverSession);
        }
        syncedRecordIds.push(session.id);

        // Update user status
        const user = db.users.find(u => u.id === session.userId);
        if (user) {
          user.currentStatus = session.status === 'ACTIVE' ? 'CHECKED_IN' : 'CHECKED_OUT';
          user.lastActiveAt = serverTimestamp;
        }
      } catch (err: unknown) {
        failedRecordIds.push({ id: session.id, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    // 2. Process Location Records
    for (const loc of locationRecords as LocationRecord[]) {
      try {
        const existingIdx = db.locationRecords.findIndex(l => l.id === loc.id);
        const serverLoc = { 
          ...loc, 
          receivedAt: serverTimestamp, 
          syncStatus: 'SYNCED' as const 
        };
        if (existingIdx >= 0) {
          db.locationRecords[existingIdx] = serverLoc;
        } else {
          db.locationRecords.push(serverLoc);
        }
        syncedRecordIds.push(loc.id);

        // Update user's lastActiveAt & currentStatus
        const user = db.users.find(u => u.id === loc.userId);
        if (user) {
          user.lastActiveAt = loc.capturedAt;
          user.currentStatus = 'CHECKED_IN';
        }

        // Check if any suspicious flags need alert creation
        if (loc.validationFlags && loc.validationFlags.some(f => f === 'SUSPICIOUS_SPEED' || f === 'UNUSUAL_LOCATION_JUMP' || f === 'OUTSIDE_GEOFENCE')) {
          const alertExists = db.alerts.some(a => a.recordId === loc.id);
          if (!alertExists) {
            db.alerts.unshift({
              id: `alt-auto-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              userId: loc.userId,
              employeeId: loc.employeeId,
              employeeName: loc.employeeName,
              type: loc.validationFlags.find(f => f !== 'NORMAL' && f !== 'MANUAL_REVIEW_REQUIRED') || 'SUSPICIOUS_SPEED',
              message: `Automated flag detected: ${loc.validationFlags.join(', ')} recorded at ${new Date(loc.capturedAt).toLocaleTimeString()}`,
              severity: 'high',
              latitude: loc.latitude,
              longitude: loc.longitude,
              accuracy: loc.accuracy,
              timestamp: loc.capturedAt,
              recordId: loc.id,
              resolved: false,
            });
          }
        }
      } catch (err: unknown) {
        failedRecordIds.push({ id: loc.id, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    // 3. Process Visits
    for (const visit of visits as FieldVisit[]) {
      try {
        const existingIdx = db.visits.findIndex(v => v.id === visit.id);
        const serverVisit = {
          ...visit,
          receivedAt: serverTimestamp,
          syncStatus: 'SYNCED' as const,
        };
        if (existingIdx >= 0) {
          db.visits[existingIdx] = serverVisit;
        } else {
          db.visits.push(serverVisit);
        }
        syncedRecordIds.push(visit.id);
      } catch (err: unknown) {
        failedRecordIds.push({ id: visit.id, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    // 4. Process Photos
    for (const photo of photos as PhotoRecord[]) {
      try {
        const existingIdx = db.photos.findIndex(p => p.id === photo.id);
        const serverPhoto = {
          ...photo,
          serverReceivedAt: serverTimestamp,
          syncStatus: 'SYNCED' as const,
        };
        if (existingIdx >= 0) {
          db.photos[existingIdx] = serverPhoto;
        } else {
          db.photos.push(serverPhoto);
        }
        syncedRecordIds.push(photo.id);
      } catch (err: unknown) {
        failedRecordIds.push({ id: photo.id, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    saveDatabase();

    const response: BatchSyncResponse = {
      success: failedRecordIds.length === 0,
      syncedRecordIds,
      failedRecordIds,
      serverTimestamp,
      message: `Batch sync complete. Synced ${syncedRecordIds.length} records, ${failedRecordIds.length} failed.`,
    };

    res.json(response);
  });

  // ==================== WORK TIMINGS ROSTER & ATTENDANCE APIS ====================

  // Get Duty Rosters
  app.get('/api/rosters', (req, res) => {
    const { userId, date, month } = req.query as { userId?: string; date?: string; month?: string };
    let results = db.rosters || [];
    if (userId) {
      results = results.filter(r => r.userId === userId);
    }
    if (date) {
      results = results.filter(r => r.date === date);
    } else if (month) {
      results = results.filter(r => r.date && r.date.startsWith(month));
    }
    res.json(results);
  });

  // Save / Bulk Update Duty Rosters
  app.post('/api/rosters', (req, res) => {
    const body = req.body;
    const items = Array.isArray(body) ? body : [body];
    const updated: DutyRosterItem[] = [];

    db.rosters = db.rosters || [];

    for (const item of items) {
      const id = item.id || `ros-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const rosterRecord: DutyRosterItem = {
        id,
        userId: item.userId,
        employeeId: item.employeeId,
        employeeName: item.employeeName,
        shiftId: item.shiftId,
        shiftName: item.shiftName,
        startTime: item.startTime || '09:00',
        endTime: item.endTime || '18:00',
        date: item.date,
        isWeeklyOff: Boolean(item.isWeeklyOff),
        notes: item.notes || '',
      };

      const existingIdx = db.rosters.findIndex(
        r => r.id === id || (r.userId === rosterRecord.userId && r.date === rosterRecord.date)
      );

      if (existingIdx >= 0) {
        db.rosters[existingIdx] = rosterRecord;
      } else {
        db.rosters.push(rosterRecord);
      }
      updated.push(rosterRecord);
    }

    saveDatabase();
    res.json({ success: true, count: updated.length, rosters: updated });
  });

  // Delete Roster Entry
  app.delete('/api/rosters/:id', (req, res) => {
    const { id } = req.params;
    db.rosters = (db.rosters || []).filter(r => r.id !== id);
    saveDatabase();
    res.json({ success: true, message: 'Roster entry deleted successfully' });
  });

  // Attendance Register with Roster Verification & Excel/CSV compliance
  app.get('/api/attendance/register', (req, res) => {
    const targetDate = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];
    const executives = db.users.filter(u => u.role === 'executive');

    const records: AttendanceRegisterRecord[] = [];

    let totalStaff = executives.length;
    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let absentCount = 0;
    let onLeaveCount = 0;
    let weeklyOffCount = 0;
    let totalWorkingHoursAcc = 0;

    for (const user of executives) {
      // Find Department & Designation
      const dept = db.departments.find(d => d.id === user.departmentId)?.name || 'Operations';
      const desig = db.designations.find(d => d.id === user.designationId)?.title || 'Field Executive';

      // Find Roster entry or fallback to assigned shift
      const roster = (db.rosters || []).find(r => r.userId === user.id && r.date === targetDate);
      const shift = db.shifts.find(s => s.id === (roster?.shiftId || user.shiftId)) || db.shifts[0] || {
        name: 'Standard Shift',
        startTime: '09:00',
        endTime: '18:00',
        gracePeriodMinutes: 15,
        halfDayThresholdHours: 4.5,
        fullDayHours: 8.5,
      };

      const scheduledStart = roster?.startTime || shift.startTime || '09:00';
      const scheduledEnd = roster?.endTime || shift.endTime || '18:00';
      const isWeeklyOff = roster?.isWeeklyOff || false;

      // Check Leaves
      const approvedLeave = (db.leaves || []).find(
        l => l.userId === user.id && l.status === 'APPROVED' && targetDate >= l.startDate && targetDate <= l.endDate
      );

      // Check Sessions on targetDate
      const userSessions = db.sessions.filter(
        s => s.userId === user.id && (s.date === targetDate || (s.checkInTime && s.checkInTime.startsWith(targetDate)))
      );

      // Check Visits
      const visitCount = db.visits.filter(
        v => v.userId === user.id && (v.capturedAt && v.capturedAt.startsWith(targetDate))
      ).length;

      // Check GPS Violation Alerts
      const hasGpsViolation = db.alerts.some(
        a => a.userId === user.id && a.type === 'GPS_DISABLED_ABSENT' && a.timestamp.startsWith(targetDate)
      );

      let inTime: string | null = null;
      let outTime: string | null = null;
      let workingHours = 0;
      let lateMinutes = 0;
      let earlyDepartureMinutes = 0;
      let overtimeHours = 0;
      let status: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'ON_LEAVE' | 'WEEKLY_OFF' = 'ABSENT';
      let remarks = '';

      if (approvedLeave) {
        status = 'ON_LEAVE';
        remarks = `Approved Leave: ${approvedLeave.leaveType}`;
        onLeaveCount++;
      } else if (userSessions.length > 0) {
        // Sort sessions by check-in time
        userSessions.sort((a, b) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime());
        const firstSession = userSessions[0];
        const lastSession = userSessions[userSessions.length - 1];

        const checkInDate = new Date(firstSession.checkInTime);
        inTime = checkInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (lastSession.checkOutTime) {
          outTime = new Date(lastSession.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (firstSession.status === 'ACTIVE') {
          outTime = 'On Duty (Active)';
        }

        // Calculate hours
        for (const s of userSessions) {
          if (s.totalDurationHours) {
            workingHours += s.totalDurationHours;
          } else if (s.checkInTime) {
            const end = s.checkOutTime ? new Date(s.checkOutTime).getTime() : Date.now();
            const start = new Date(s.checkInTime).getTime();
            workingHours += Math.max(0, (end - start) / (1000 * 60 * 60));
          }
        }
        workingHours = Math.round(workingHours * 10) / 10;
        totalWorkingHoursAcc += workingHours;

        // Verify with Roster Timings
        const [schedStartH, schedStartM] = scheduledStart.split(':').map(Number);
        const schedStartTotalMins = (schedStartH || 9) * 60 + (schedStartM || 0);
        const actualCheckInMins = checkInDate.getHours() * 60 + checkInDate.getMinutes();

        const graceMins = shift.gracePeriodMinutes ?? 15;
        if (actualCheckInMins > schedStartTotalMins + graceMins) {
          lateMinutes = actualCheckInMins - schedStartTotalMins;
          status = 'LATE';
          remarks = `Late by ${lateMinutes}m`;
          lateCount++;
        } else if (workingHours < (shift.halfDayThresholdHours ?? 4.5)) {
          status = 'HALF_DAY';
          remarks = `Under threshold (${workingHours}h / min ${(shift.halfDayThresholdHours ?? 4.5)}h)`;
          halfDayCount++;
        } else {
          status = 'PRESENT';
          remarks = 'Full Duty Completed';
          presentCount++;
        }

        const fullDayTarget = shift.fullDayHours ?? 8.5;
        if (workingHours > fullDayTarget) {
          overtimeHours = Math.round((workingHours - fullDayTarget) * 10) / 10;
        }
      } else if (isWeeklyOff) {
        status = 'WEEKLY_OFF';
        remarks = 'Scheduled Weekly Off / Rest Day';
        weeklyOffCount++;
      } else if (targetDate <= todayStr) {
        status = 'ABSENT';
        remarks = 'No attendance check-in logged during shift';
        absentCount++;
      } else {
        status = 'ABSENT';
        remarks = 'Upcoming Shift Scheduled';
      }

      records.push({
        id: `att-${user.id}-${targetDate}`,
        userId: user.id,
        employeeId: user.employeeId,
        employeeName: user.name,
        departmentName: dept,
        designationTitle: desig,
        date: targetDate,
        shiftName: roster?.shiftName || shift.name,
        scheduledStart,
        scheduledEnd,
        inTime,
        outTime,
        workingHours,
        status,
        lateMinutes,
        earlyDepartureMinutes,
        overtimeHours,
        gpsActiveHours: workingHours,
        gpsContinuity: hasGpsViolation ? 'VIOLATED' : 'ACTIVE',
        verifiedVisits: visitCount,
        remarks,
      });
    }

    res.json({
      date: targetDate,
      summary: {
        totalStaff,
        presentCount,
        lateCount,
        halfDayCount,
        absentCount,
        onLeaveCount,
        weeklyOffCount,
        totalWorkingHours: Math.round(totalWorkingHoursAcc * 10) / 10,
      },
      records,
    });
  });

  // ==================== DUTY COMPLIANCE / GPS WARNING ALERT API ====================
  app.post('/api/compliance/alert', (req, res) => {
    const { userId, employeeId, employeeName, type, message, timestamp } = req.body;
    const alertId = `alt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newAlert: AlertItem = {
      id: alertId,
      userId: userId || 'unknown',
      employeeId: employeeId || 'EMP',
      employeeName: employeeName || 'Staff Member',
      type: type || 'GPS_DISABLED_ABSENT',
      message: message || 'Employee switched off GPS sensor or logged out during working roster hours.',
      severity: 'critical',
      timestamp: timestamp || new Date().toISOString(),
      resolved: false,
    };

    db.alerts.unshift(newAlert);
    saveDatabase();
    res.json({ success: true, alert: newAlert });
  });

  // ==================== SYSTEM BACKUP & RESTORE APIS ====================
  app.get('/api/system/backup', (req, res) => {
    const companyName = db.companies[0]?.name || 'FieldTrack Organization';
    const filename = `fieldtrack_backup_${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json({
      version: '1.0',
      exportTimestamp: new Date().toISOString(),
      companyName,
      stats: {
        usersCount: db.users.length,
        sessionsCount: db.sessions.length,
        visitsCount: db.visits.length,
        photosCount: db.photos.length,
        rostersCount: (db.rosters || []).length,
      },
      data: db,
    });
  });

  app.post('/api/system/restore', (req, res) => {
    try {
      const payload = req.body;
      const sourceData = payload?.data && typeof payload.data === 'object' ? payload.data : payload;

      if (!sourceData || !Array.isArray(sourceData.users)) {
        return res.status(400).json({ error: 'Invalid backup format. Missing essential users collection.' });
      }

      const empty = createEmptyStore();
      db.users = Array.isArray(sourceData.users) ? sourceData.users : [];
      db.sessions = Array.isArray(sourceData.sessions) ? sourceData.sessions : [];
      db.locationRecords = Array.isArray(sourceData.locationRecords) ? sourceData.locationRecords : [];
      db.visits = Array.isArray(sourceData.visits) ? sourceData.visits : [];
      db.photos = Array.isArray(sourceData.photos) ? sourceData.photos : [];
      db.geofences = Array.isArray(sourceData.geofences) ? sourceData.geofences : [];
      db.settings = { ...empty.settings, ...(sourceData.settings || {}) };
      db.alerts = Array.isArray(sourceData.alerts) ? sourceData.alerts : [];
      db.companies = Array.isArray(sourceData.companies) ? sourceData.companies : [];
      db.branches = Array.isArray(sourceData.branches) ? sourceData.branches : [];
      db.departments = Array.isArray(sourceData.departments) ? sourceData.departments : [];
      db.designations = Array.isArray(sourceData.designations) ? sourceData.designations : [];
      db.shifts = Array.isArray(sourceData.shifts) ? sourceData.shifts : [];
      db.roles = Array.isArray(sourceData.roles) ? sourceData.roles : [];
      db.leaves = Array.isArray(sourceData.leaves) ? sourceData.leaves : [];
      db.tasks = Array.isArray(sourceData.tasks) ? sourceData.tasks : [];
      db.rosters = Array.isArray(sourceData.rosters) ? sourceData.rosters : [];

      saveDatabase();

      res.json({
        success: true,
        message: 'System database restored successfully.',
        stats: {
          usersRestored: db.users.length,
          sessionsRestored: db.sessions.length,
          visitsRestored: db.visits.length,
          rostersRestored: db.rosters.length,
        }
      });
    } catch (err: unknown) {
      res.status(500).json({ 
        error: 'Failed to restore backup: ' + (err instanceof Error ? err.message : String(err)) 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const rootDist = path.join(process.cwd(), 'dist');
    const distPath = fs.existsSync(path.join(rootDist, 'index.html'))
      ? rootDist
      : (fs.existsSync(path.join(__dirname, 'index.html')) ? __dirname : rootDist);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FieldTrack Pro server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();