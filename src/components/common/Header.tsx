import React, { useState } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  UserCheck, 
  Shield, 
  Smartphone, 
  Users, 
  ChevronDown,
  Sparkles,
  LogOut,
  Building2,
  AlertTriangle,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import { PwaInstallPrompt } from './PwaInstallPrompt';

export const Header: React.FC = () => {
  const { currentUser, logout, systemStatus } = useAuth();
  const { 
    isOnline, 
    isSimulatedOffline, 
    syncState, 
    pendingCount, 
    toggleSimulatedOffline, 
    syncNow 
  } = useSync();

  const [isSwitchOpen, setIsSwitchOpen] = useState(false);
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);

  const handleLogoutClick = () => {
    setIsSwitchOpen(false);
    // If executive, raise warning about working hours / GPS duty
    if (currentUser?.role === 'executive') {
      setShowLogoutWarning(true);
    } else {
      logout();
    }
  };

  const confirmLogout = () => {
    setShowLogoutWarning(false);
    logout();
  };

  if (!currentUser) return null;

  // Sync state badge rendering
  const renderSyncBadge = () => {
    switch (syncState) {
      case 'ONLINE_SYNCED':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200 text-xs font-semibold shadow-xs">
            <span className="w-2 h-2 bg-green-500 rounded-full status-pulse" />
            <span className="hidden sm:inline">LIVE GPS ONLINE</span>
            <span className="sm:hidden">ONLINE</span>
          </div>
        );
      case 'OFFLINE_SAVED':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200 text-xs font-semibold shadow-xs">
            <span className="w-2 h-2 bg-amber-500 rounded-full" />
            <WifiOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">OFFLINE &bull; INDEXEDDB</span>
            <span className="sm:hidden">OFFLINE</span>
            {pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-600 text-white rounded-full font-bold text-[10px]">
                {pendingCount}
              </span>
            )}
          </div>
        );
      case 'SYNCING':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200 text-xs font-semibold shadow-xs">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
            <span>SYNCING {pendingCount > 0 ? `(${pendingCount})` : ''}</span>
          </div>
        );
      case 'SYNC_FAILED':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-700 rounded-full border border-rose-200 text-xs font-semibold shadow-xs">
            <span className="w-2 h-2 bg-rose-500 rounded-full" />
            <span>SYNC FAILED &bull; {pendingCount} PENDING</span>
          </div>
        );
    }
  };

  const displayName = currentUser.name || 'User';
  const roleLabel = currentUser.role === 'manager' || currentUser.role === 'admin' ? 'Operations Manager' : 'Field Executive';
  const companyTitle = systemStatus?.companyName || 'FIELDTRACK PRO';
  const companySub = systemStatus?.companyCode ? `${systemStatus.companyCode} • OPS COMMAND` : 'OPS COMMAND';

  return (
    <nav className="h-14 sm:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 z-40 sticky top-0 shadow-xs text-slate-800">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-600/20 text-white shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
        </div>
        <div className="flex items-baseline gap-1.5 truncate">
          <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 truncate">
            {companyTitle} <span className="text-blue-600 font-medium text-xs">| {companySub}</span>
          </h1>
          <span className="hidden lg:inline-flex px-1.5 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-600 rounded border border-slate-200 uppercase shrink-0">
            PWA Sync
          </span>
        </div>
      </div>

      {/* Center & Right Status & Actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Sync Status Badge */}
        {renderSyncBadge()}

        {/* Sync Queue Summary */}
        <div className="hidden md:flex items-center gap-4 border-l pl-3 sm:pl-4 border-slate-200">
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sync Queue</p>
            <p className="text-xs sm:text-sm font-mono font-bold text-blue-600">
              {pendingCount > 0 ? `${pendingCount} Pending` : '0 Pending'}
            </p>
          </div>
        </div>

        {/* Simulate Offline Button */}
        <button
          onClick={toggleSimulatedOffline}
          title={isSimulatedOffline ? 'Resume Online Connectivity' : 'Simulate Offline Field Mode'}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
            isSimulatedOffline 
              ? 'bg-amber-50 text-amber-800 border-amber-300' 
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          {isSimulatedOffline ? <WifiOff className="w-3.5 h-3.5 text-amber-600" /> : <Wifi className="w-3.5 h-3.5 text-slate-500" />}
          <span className="text-[11px] font-semibold">{isSimulatedOffline ? 'Simulating Offline' : 'Simulate Offline'}</span>
        </button>

        {/* Download PWA Mobile App */}
        <PwaInstallPrompt variant="button" />

        {/* Manual Sync Trigger */}
        {isOnline && pendingCount > 0 && (
          <button
            onClick={() => syncNow()}
            className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>
        )}

        {/* User Account Menu */}
        <div className="relative">
          <button
            onClick={() => setIsSwitchOpen(!isSwitchOpen)}
            className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all text-left cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
              {displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-900 leading-tight">
                {displayName}
              </div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold">
                <span className="text-blue-600 font-bold uppercase">{currentUser.role}</span> &bull; <span>{currentUser.employeeId}</span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Dropdown Menu */}
          {isSwitchOpen && (
            <div className="absolute right-0 top-12 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 divide-y divide-slate-100 text-slate-800 animate-in fade-in zoom-in-95 duration-100">
              <div className="p-3 mb-1">
                <div className="font-bold text-slate-900 text-sm">{currentUser.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{currentUser.email}</div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200">
                  <Shield className="w-3 h-3 text-blue-600" />
                  <span>{roleLabel} ({currentUser.employeeId})</span>
                </div>
              </div>

              {/* Account & Deployment Actions */}
              <div className="pt-2 space-y-1">
                <button
                  onClick={toggleSimulatedOffline}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg transition-colors font-medium cursor-pointer"
                >
                  {isSimulatedOffline ? <Wifi className="w-4 h-4 text-green-600" /> : <WifiOff className="w-4 h-4 text-amber-600" />}
                  <span>{isSimulatedOffline ? 'Resume Online Connectivity' : 'Simulate Field Offline Mode'}</span>
                </button>

                <button
                  onClick={handleLogoutClick}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-semibold cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Log Out of Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Accidental Logout Warning Modal */}
      {showLogoutWarning && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-800 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-sm">Accidental Logout Warning</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  You are attempting to log out during scheduled duty/roster hours. Logging out stops background GPS tracking and may flag an <strong>attendance non-compliance penalty</strong>.
                </p>
              </div>
            </div>

            <div className="p-3 my-4 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-900 font-medium">
              If you clicked "Log Out" by mistake, click <strong>Stay Logged In</strong> to continue your duty uninterrupted.
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowLogoutWarning(false)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                Stay Logged In (Mistake)
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="px-4 py-2.5 bg-slate-100 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-bold transition-colors"
              >
                Log Out Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
