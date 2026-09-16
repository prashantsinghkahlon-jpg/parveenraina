import React, { useState, useEffect } from 'react';
import { 
  Map, 
  Play, 
  Users, 
  Camera, 
  ShieldAlert, 
  FileText, 
  Settings, 
  Activity, 
  CheckCircle, 
  Navigation, 
  TrendingUp, 
  AlertTriangle,
  RotateCw,
  Eye,
  LogOut,
  Radio,
  Briefcase,
  Banknote,
  CalendarCheck,
  Database,
  UserPlus,
  Maximize2,
  Minimize2,
  Monitor,
  ShieldCheck,
  CalendarRange,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import { User, LocationRecord, WorkSession, Geofence, FieldVisit, AlertItem } from '../../types';
import { ApiService } from '../../services/api';
import { LiveMap } from './LiveMap';
import { RoutePlayback } from './RoutePlayback';
import { PhotoVerificationGallery } from './PhotoVerificationGallery';
import { AlertsPanel } from './AlertsPanel';
import { ReportsExport } from './ReportsExport';
import { AdminSettingsPanel } from './AdminSettingsPanel';
import { ExecutiveDetailModal } from './ExecutiveDetailModal';
import { EmployeeMasterView } from './EmployeeMasterView';
import { MasterManagement } from './MasterManagement';
import { SalaryCalculationPanel } from './SalaryCalculationPanel';
import { LeaveApprovalsPanel } from './LeaveApprovalsPanel';
import { StaffRegistrationModal } from './StaffRegistrationModal';
import { RolesManagementPanel } from './RolesManagementPanel';
import { DutyRosterPanel } from './DutyRosterPanel';
import { AttendanceRegisterPanel } from './AttendanceRegisterPanel';

type ManagerTab = 
  | 'map' 
  | 'playback' 
  | 'employees' 
  | 'salary' 
  | 'leaves' 
  | 'roles' 
  | 'masters' 
  | 'photos' 
  | 'alerts' 
  | 'reports' 
  | 'settings'
  | 'roster'
  | 'attendance_register';

type MenuCategory = 'operations' | 'attendance' | 'workforce' | 'admin';

export const ManagerDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ManagerTab>('map');
  const [activeCategory, setActiveCategory] = useState<MenuCategory>('operations');
  const [executives, setExecutives] = useState<(User & {
    latestLocation?: LocationRecord;
    activeSession?: WorkSession;
    todayVisitsCount?: number;
  })[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [visits, setVisits] = useState<FieldVisit[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 16:9 Projector / Large Screen Display Mode
  const [is16to9Mode, setIs16to9Mode] = useState(false);

  // Register Modal
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Selected for drilldown
  const [selectedExecutiveId, setSelectedExecutiveId] = useState<string | null>(null);
  const [playbackExecutiveId, setPlaybackExecutiveId] = useState<string | null>(null);
  const [inspectPhotoUrl, setInspectPhotoUrl] = useState<string | null>(null);

  // Synchronize category with active tab
  const handleSelectTab = (tab: ManagerTab) => {
    setActiveTab(tab);
    if (['map', 'playback', 'photos', 'alerts'].includes(tab)) {
      setActiveCategory('operations');
    } else if (['attendance_register', 'roster', 'leaves'].includes(tab)) {
      setActiveCategory('attendance');
    } else if (['employees', 'salary', 'roles'].includes(tab)) {
      setActiveCategory('workforce');
    } else {
      setActiveCategory('admin');
    }
  };

  const handleCategoryClick = (category: MenuCategory) => {
    setActiveCategory(category);
    switch (category) {
      case 'operations':
        if (!['map', 'playback', 'photos', 'alerts'].includes(activeTab)) setActiveTab('map');
        break;
      case 'attendance':
        if (!['attendance_register', 'roster', 'leaves'].includes(activeTab)) setActiveTab('attendance_register');
        break;
      case 'workforce':
        if (!['employees', 'salary', 'roles'].includes(activeTab)) setActiveTab('employees');
        break;
      case 'admin':
        if (!['masters', 'reports', 'settings'].includes(activeTab)) setActiveTab('reports');
        break;
    }
  };

  const loadData = async () => {
    try {
      const [liveFeed, vsts, alrts] = await Promise.all([
        ApiService.getLiveTrackingFeed(),
        ApiService.getAllVisits(),
        ApiService.getAlerts(),
      ]);
      setExecutives(Array.isArray(liveFeed?.executives) ? liveFeed.executives : []);
      setGeofences(Array.isArray(liveFeed?.geofences) ? liveFeed.geofences : []);
      setVisits(Array.isArray(vsts) ? vsts : []);
      setAlerts(Array.isArray(alrts) ? alrts : []);
    } catch (err) {
      console.warn('Failed to load manager dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000); // 20s auto polling
    return () => clearInterval(interval);
  }, []);

  const safeExecutives = Array.isArray(executives) ? executives : [];
  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  const checkedInCount = safeExecutives.filter(e => e && e.currentStatus === 'CHECKED_IN').length;
  const activeAlertsCount = safeAlerts.filter(a => a && !a.resolved).length;
  const totalLocationsCount = safeExecutives.reduce((acc, e) => acc + (e?.activeSession?.totalUpdates || 0), 0);

  return (
    <div className={`transition-all duration-300 ${
      is16to9Mode 
        ? 'w-full max-w-[1920px] mx-auto p-4 sm:p-6 bg-slate-950 text-slate-100 flex flex-col space-y-4 min-h-[calc(100vh-3.5rem)]' 
        : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 pb-24 text-slate-800'
    }`}>
      {/* 16:9 Projection Mode Toolbar & Quick Actions */}
      <div className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border transition-all ${
        is16to9Mode 
          ? 'bg-slate-900/90 border-slate-800 text-slate-200' 
          : 'bg-white border-slate-200 text-slate-700 shadow-xs'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
            FT
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm tracking-tight text-inherit">
                FieldTrack Pro Command Center
              </h2>
              {is16to9Mode && (
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-400/30">
                  16:9 CINEMA PROJECTION
                </span>
              )}
            </div>
            <p className="text-[11px] opacity-70">
              Attendance, GPS Enforcement, Verification &amp; Payroll Management
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Register Button */}
          <button
            onClick={() => setShowRegisterModal(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register Staff</span>
          </button>

          {/* 16:9 Screen Projection Mode Toggle */}
          <button
            onClick={() => setIs16to9Mode(!is16to9Mode)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors ${
              is16to9Mode 
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-xs' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
            title="Toggle 16:9 widescreen layout for conference room projectors and TV displays"
          >
            {is16to9Mode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{is16to9Mode ? 'Exit 16:9 Mode' : 'Project 16:9'}</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={loadData}
            className="p-1.5 rounded-xl border border-slate-300/40 hover:bg-slate-100/20 text-inherit transition-colors"
            title="Refresh Central Data"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Active Executives */}
        <div className={`rounded-2xl p-4 shadow-xs transition-all flex flex-col justify-between ${
          is16to9Mode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold opacity-70 uppercase tracking-wider">Active Staff</span>
            <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 border border-green-200 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono">{checkedInCount}</span>
            <span className="text-[10px] text-green-700 font-bold bg-green-50 border border-green-200 px-2 py-0.5 rounded-md flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full status-pulse" />
              Live Duty
            </span>
          </div>
          <p className="mt-1 text-[11px] opacity-70 font-medium">
            {checkedInCount} of {executives.length} staff checked in
          </p>
        </div>

        {/* KPI 2: Total GPS Updates */}
        <div className={`rounded-2xl p-4 shadow-xs transition-all flex flex-col justify-between ${
          is16to9Mode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold opacity-70 uppercase tracking-wider">GPS Pings</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
              <Navigation className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-blue-500">{totalLocationsCount}</span>
            <span className="text-[10px] text-blue-600 font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
              High Precision
            </span>
          </div>
          <p className="mt-1 text-[11px] opacity-70 font-medium">Continuous telemetry feed</p>
        </div>

        {/* KPI 3: Field Visits Logged */}
        <div className={`rounded-2xl p-4 shadow-xs transition-all flex flex-col justify-between ${
          is16to9Mode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold opacity-70 uppercase tracking-wider">Verified Visits</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-teal-500">{visits.length}</span>
            <span className="text-[10px] text-teal-700 font-bold bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
              100% Geo-stamped
            </span>
          </div>
          <p className="mt-1 text-[11px] opacity-70 font-medium">Camera verified visits</p>
        </div>

        {/* KPI 4: Security Alerts */}
        <div 
          onClick={() => setActiveTab('alerts')}
          className={`rounded-2xl p-4 shadow-xs cursor-pointer transition-all flex flex-col justify-between ${
            is16to9Mode 
              ? 'bg-slate-900 border border-slate-800' 
              : activeAlertsCount > 0 ? 'bg-white border border-red-200' : 'bg-white border border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold opacity-70 uppercase tracking-wider">Duty Alerts</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
              activeAlertsCount > 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-2xl font-black font-mono ${
              activeAlertsCount > 0 ? 'text-red-500' : ''
            }`}>
              {activeAlertsCount}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
              activeAlertsCount > 0 
                ? 'text-red-700 bg-red-50 border-red-200' 
                : 'text-slate-600 bg-slate-50 border-slate-200'
            }`}>
              {activeAlertsCount > 0 ? 'Action Req.' : 'Nominal'}
            </span>
          </div>
          <p className={`mt-1 text-[11px] font-medium ${
            activeAlertsCount > 0 ? 'text-red-500' : 'opacity-70'
          }`}>
            {activeAlertsCount > 0 ? 'GPS disabled / breach events' : 'All systems nominal'}
          </p>
        </div>
      </div>

      {/* ================= STANDARD ENTERPRISE MENU STRUCTURE ================= */}
      <div className="space-y-2">
        {/* Tier 1: Core Corporate Categories */}
        <div className={`p-1.5 rounded-2xl border transition-all ${
          is16to9Mode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
            {/* Category 1: Live Operations */}
            <button
              onClick={() => handleCategoryClick('operations')}
              className={`p-3 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                activeCategory === 'operations'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : is16to9Mode 
                    ? 'hover:bg-slate-800 text-slate-300' 
                    : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  activeCategory === 'operations' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
                }`}>
                  <Activity className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="block text-xs font-bold leading-tight truncate">Live Operations</span>
                  <span className={`text-[10px] block truncate ${
                    activeCategory === 'operations' ? 'text-blue-100' : 'text-slate-400'
                  }`}>
                    GPS, Route, Cameras
                  </span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                activeCategory === 'operations' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-green-100 text-green-700'
              }`}>
                {checkedInCount} ACTIVE
              </span>
            </button>

            {/* Category 2: Attendance & Rosters */}
            <button
              onClick={() => handleCategoryClick('attendance')}
              className={`p-3 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                activeCategory === 'attendance'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : is16to9Mode 
                    ? 'hover:bg-slate-800 text-slate-300' 
                    : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  activeCategory === 'attendance' ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-600'
                }`}>
                  <CalendarRange className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="block text-xs font-bold leading-tight truncate">Attendance &amp; Rosters</span>
                  <span className={`text-[10px] block truncate ${
                    activeCategory === 'attendance' ? 'text-blue-100' : 'text-slate-400'
                  }`}>
                    Work Times, Shifts, Register
                  </span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                activeCategory === 'attendance' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-teal-100 text-teal-700'
              }`}>
                REGISTER
              </span>
            </button>

            {/* Category 3: Workforce & Payroll */}
            <button
              onClick={() => handleCategoryClick('workforce')}
              className={`p-3 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                activeCategory === 'workforce'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : is16to9Mode 
                    ? 'hover:bg-slate-800 text-slate-300' 
                    : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  activeCategory === 'workforce' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'
                }`}>
                  <Users className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="block text-xs font-bold leading-tight truncate">Staff &amp; Payroll</span>
                  <span className={`text-[10px] block truncate ${
                    activeCategory === 'workforce' ? 'text-blue-100' : 'text-slate-400'
                  }`}>
                    Employees, Salary, Roles
                  </span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                activeCategory === 'workforce' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-indigo-100 text-indigo-700'
              }`}>
                {executives.length} STAFF
              </span>
            </button>

            {/* Category 4: Administration & Setup */}
            <button
              onClick={() => handleCategoryClick('admin')}
              className={`p-3 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                activeCategory === 'admin'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : is16to9Mode 
                    ? 'hover:bg-slate-800 text-slate-300' 
                    : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  activeCategory === 'admin' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  <Settings className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="block text-xs font-bold leading-tight truncate">Administration</span>
                  <span className={`text-[10px] block truncate ${
                    activeCategory === 'admin' ? 'text-blue-100' : 'text-slate-400'
                  }`}>
                    Reports, Masters, Map API
                  </span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                activeCategory === 'admin' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-slate-200 text-slate-700'
              }`}>
                SYSTEM
              </span>
            </button>
          </div>
        </div>

        {/* Tier 2: Categorized Sub-Menu Action Items */}
        <div className={`p-2 rounded-2xl border transition-all ${
          is16to9Mode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex flex-wrap items-center gap-2">
            {activeCategory === 'operations' && (
              <>
                <button
                  onClick={() => handleSelectTab('map')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'map' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <Map className="w-3.5 h-3.5" />
                  <span>Live Tracking Map</span>
                </button>
                <button
                  onClick={() => handleSelectTab('playback')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'playback' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Route Playback</span>
                </button>
                <button
                  onClick={() => handleSelectTab('photos')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'photos' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Photo Verification</span>
                </button>
                <button
                  onClick={() => handleSelectTab('alerts')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'alerts' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-rose-700 border border-rose-200'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Duty &amp; Security Alerts ({activeAlertsCount})</span>
                </button>
              </>
            )}

            {activeCategory === 'attendance' && (
              <>
                <button
                  onClick={() => handleSelectTab('attendance_register')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'attendance_register' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <CalendarRange className="w-3.5 h-3.5" />
                  <span>Attendance Register (Daily Present/Absent &amp; Excel)</span>
                </button>
                <button
                  onClick={() => handleSelectTab('roster')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'roster' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Work Timings &amp; Duty Roster</span>
                </button>
                <button
                  onClick={() => handleSelectTab('leaves')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'leaves' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>Leave Approvals</span>
                </button>
              </>
            )}

            {activeCategory === 'workforce' && (
              <>
                <button
                  onClick={() => handleSelectTab('employees')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'employees' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Staff Directory ({executives.length})</span>
                </button>
                <button
                  onClick={() => handleSelectTab('salary')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'salary' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Payroll &amp; Wage Calculation</span>
                </button>
                <button
                  onClick={() => handleSelectTab('roles')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'roles' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Roles &amp; Access Policies</span>
                </button>
              </>
            )}

            {activeCategory === 'admin' && (
              <>
                <button
                  onClick={() => handleSelectTab('reports')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'reports' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Executive Performance Reports</span>
                </button>
                <button
                  onClick={() => handleSelectTab('masters')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'masters' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Masters Setup</span>
                </button>
                <button
                  onClick={() => handleSelectTab('settings')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'settings' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Geofences, Map API &amp; Backup</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Tab Content View */}
      <div className="flex-1">
        {activeTab === 'map' && (
          <LiveMap
            executives={executives}
            geofences={geofences}
            visits={visits}
            onSelectExecutive={(id) => setSelectedExecutiveId(id)}
            onOpenPlayback={(id) => {
              setPlaybackExecutiveId(id);
              handleSelectTab('playback');
            }}
            onViewPhoto={(url) => setInspectPhotoUrl(url)}
            is16to9Mode={is16to9Mode}
            onToggle16to9={() => setIs16to9Mode(!is16to9Mode)}
          />
        )}

        {activeTab === 'attendance_register' && (
          <AttendanceRegisterPanel executives={executives} />
        )}

        {activeTab === 'roster' && (
          <DutyRosterPanel executives={executives} />
        )}

        {activeTab === 'employees' && (
          <EmployeeMasterView
            users={executives}
            onOpenRegister={() => setShowRegisterModal(true)}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'salary' && (
          <SalaryCalculationPanel />
        )}

        {activeTab === 'leaves' && (
          <LeaveApprovalsPanel
            onRefresh={loadData}
          />
        )}

        {activeTab === 'roles' && (
          <RolesManagementPanel />
        )}

        {activeTab === 'masters' && (
          <MasterManagement />
        )}

        {activeTab === 'playback' && (
          <RoutePlayback
            executives={executives}
            initialExecutiveId={playbackExecutiveId || executives[0]?.id}
            onViewPhoto={(url) => setInspectPhotoUrl(url)}
          />
        )}

        {activeTab === 'photos' && (
          <PhotoVerificationGallery
            executives={executives}
            onOpenPhotoModal={(url) => setInspectPhotoUrl(url)}
          />
        )}

        {activeTab === 'alerts' && (
          <AlertsPanel executives={executives} />
        )}

        {activeTab === 'reports' && (
          <ReportsExport executives={executives} />
        )}

        {activeTab === 'settings' && (
          <AdminSettingsPanel
            executives={executives}
            onRefreshData={loadData}
          />
        )}
      </div>

      {/* Staff Registration Modal */}
      {showRegisterModal && (
        <StaffRegistrationModal
          isOpen={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
          onSuccess={() => {
            setShowRegisterModal(false);
            loadData();
          }}
        />
      )}

      {/* Executive Detail Drill-down Modal */}
      {selectedExecutiveId && (
        <ExecutiveDetailModal
          executiveId={selectedExecutiveId}
          onClose={() => setSelectedExecutiveId(null)}
          onOpenPlayback={(id) => {
            setSelectedExecutiveId(null);
            setPlaybackExecutiveId(id);
            handleSelectTab('playback');
          }}
          onViewPhoto={(url) => setInspectPhotoUrl(url)}
        />
      )}

      {/* Photo Full Modal Preview */}
      {inspectPhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setInspectPhotoUrl(null)}
        >
          <div className="max-w-xl w-full bg-white rounded-2xl overflow-hidden border border-slate-200 p-3 relative shadow-2xl">
            <img src={inspectPhotoUrl} alt="Inspection" className="w-full rounded-xl object-cover" />
            <button
              onClick={() => setInspectPhotoUrl(null)}
              className="mt-3 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl"
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
