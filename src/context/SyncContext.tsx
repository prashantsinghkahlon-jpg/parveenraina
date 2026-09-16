import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getPendingSyncData } from '../db/indexedDB';
import { ApiService } from '../services/api';
import { useAuth } from './AuthContext';

export type GlobalSyncState = 'ONLINE_SYNCED' | 'OFFLINE_SAVED' | 'SYNCING' | 'SYNC_FAILED';

interface SyncContextType {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  syncState: GlobalSyncState;
  pendingCount: number;
  lastSyncTime: string | null;
  syncErrorMessage: string | null;
  toggleSimulatedOffline: () => void;
  syncNow: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [browserOnline, setBrowserOnline] = useState<boolean>(navigator.onLine);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return localStorage.getItem('fieldtrack_last_sync_time') || new Date().toISOString();
  });
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);

  const effectiveOnline = browserOnline && !isSimulatedOffline;

  // Refresh pending count from local IndexedDB
  const refreshPendingCount = useCallback(async () => {
    try {
      const data = await getPendingSyncData(currentUser?.role === 'executive' ? currentUser.id : undefined);
      setPendingCount(data.totalCount);
    } catch (err) {
      console.warn('Error reading pending items:', err);
    }
  }, [currentUser]);

  // Execute batch sync
  const syncNow = useCallback(async () => {
    if (!effectiveOnline) {
      console.log('Cannot sync: device is currently offline');
      return;
    }
    if (isSyncing) return;

    setIsSyncing(true);
    setSyncErrorMessage(null);

    try {
      const result = await ApiService.syncPendingRecords(currentUser?.role === 'executive' ? currentUser.id : undefined);
      const nowStr = new Date().toISOString();
      setLastSyncTime(nowStr);
      localStorage.setItem('fieldtrack_last_sync_time', nowStr);
      await refreshPendingCount();
      
      if (result.failedCount > 0) {
        setSyncErrorMessage(`Synced ${result.syncedCount} items, but ${result.failedCount} failed. Remaining in local queue.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network sync failed';
      setSyncErrorMessage(msg);
    } finally {
      setIsSyncing(false);
    }
  }, [effectiveOnline, isSyncing, currentUser, refreshPendingCount]);

  // Listen to network status changes
  useEffect(() => {
    const handleOnline = () => {
      setBrowserOnline(true);
      if (!isSimulatedOffline) {
        syncNow();
      }
    };
    const handleOffline = () => setBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isSimulatedOffline, syncNow]);

  // Periodic check & auto-sync when online
  useEffect(() => {
    refreshPendingCount();

    const interval = setInterval(() => {
      refreshPendingCount();
      if (effectiveOnline && pendingCount > 0 && !isSyncing) {
        syncNow();
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [effectiveOnline, pendingCount, isSyncing, refreshPendingCount, syncNow]);

  const toggleSimulatedOffline = () => {
    setIsSimulatedOffline(prev => {
      const next = !prev;
      if (!next && browserOnline) {
        // Just returned online -> trigger auto sync
        setTimeout(() => syncNow(), 300);
      }
      return next;
    });
  };

  // Determine current sync state
  let syncState: GlobalSyncState = 'ONLINE_SYNCED';
  if (!effectiveOnline) {
    syncState = 'OFFLINE_SAVED';
  } else if (isSyncing) {
    syncState = 'SYNCING';
  } else if (syncErrorMessage && pendingCount > 0) {
    syncState = 'SYNC_FAILED';
  } else if (pendingCount > 0) {
    syncState = 'SYNCING';
  }

  return (
    <SyncContext.Provider
      value={{
        isOnline: effectiveOnline,
        isSimulatedOffline,
        syncState,
        pendingCount,
        lastSyncTime,
        syncErrorMessage,
        toggleSimulatedOffline,
        syncNow,
        refreshPendingCount,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
