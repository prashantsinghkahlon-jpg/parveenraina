/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext';
import { OrganizationProvider } from './context/OrganizationContext';
import { Header } from './components/common/Header';
import { ExecutiveDashboard } from './components/executive/ExecutiveDashboard';
import { ManagerDashboard } from './components/manager/ManagerDashboard';
import { LoginScreen } from './components/auth/LoginScreen';
import { SetupWizard } from './components/auth/SetupWizard';

const AppContent: React.FC = () => {
  const { currentUser, isInitialized, isAuthenticated, isLoading } = useAuth();
  const [forceSetupMode, setForceSetupMode] = useState(false);

  // Initial Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-200">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-600/30 text-white mb-4 animate-pulse">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
        </div>
        <h2 className="text-base font-bold text-white tracking-wide">FIELDTRACK PRO</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting to enterprise persistence node...</p>
        <div className="mt-4 w-32 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="w-1/2 h-full bg-blue-500 rounded-full animate-indeterminate" />
        </div>
      </div>
    );
  }

  // First-Time Deployment Setup Wizard
  if (!isInitialized || forceSetupMode) {
    return (
      <SetupWizard 
        onSetupSuccess={() => setForceSetupMode(false)} 
      />
    );
  }

  // User Login Window
  if (!isAuthenticated || !currentUser) {
    return (
      <LoginScreen 
        onOpenSetup={() => setForceSetupMode(true)}
      />
    );
  }

  // Authenticated Application
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans selection:bg-blue-600 selection:text-white flex flex-col antialiased">
      {/* Top Universal App Navigation & Role Profile */}
      <Header />

      {/* Main Role-Specific View */}
      <main className="flex-1 w-full overflow-y-auto">
        {currentUser.role === 'executive' ? (
          <ExecutiveDashboard />
        ) : (
          <ManagerDashboard />
        )}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <OrganizationProvider>
        <SyncProvider>
          <AppContent />
        </SyncProvider>
      </OrganizationProvider>
    </AuthProvider>
  );
}
