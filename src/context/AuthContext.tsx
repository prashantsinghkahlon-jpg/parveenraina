import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole, SystemStatus, SetupPayload } from '../types';
import { ApiService } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  allUsers: User[];
  systemStatus: SystemStatus | null;
  isInitialized: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  authToken: string | null;
  setCurrentUser: (user: User) => void;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  completeSetup: (payload: SetupPayload) => Promise<void>;
  refreshSystemStatus: () => Promise<SystemStatus | null>;
  refreshUsers: () => Promise<void>;
  switchUserById: (userId: string) => void;
  switchRole: (role: UserRole) => void;
  resetSystem: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'fieldtrack_auth_token';
const USER_KEY = 'fieldtrack_current_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<User | null>(() => {
    const saved = localStorage.getItem(USER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY) || null;
  });

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check system status (is company configured? are there users?)
  const refreshSystemStatus = useCallback(async (): Promise<SystemStatus | null> => {
    try {
      const status = await ApiService.getSystemStatus();
      setSystemStatus(status);
      return status;
    } catch (err) {
      console.warn('Could not check system deployment status:', err);
      return null;
    }
  }, []);

  // Refresh users from database
  const refreshUsers = useCallback(async () => {
    try {
      const users = await ApiService.getUsers();
      if (Array.isArray(users)) {
        setAllUsers(users);
        // keep current user updated if they still exist
        if (currentUser) {
          const updated = users.find(u => u.id === currentUser.id);
          if (updated) {
            setCurrentUserState(updated);
            localStorage.setItem(USER_KEY, JSON.stringify(updated));
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load users from API:', err);
    }
  }, [currentUser]);

  // Initial startup verification
  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      setIsLoading(true);
      try {
        const status = await refreshSystemStatus();
        if (status && status.isInitialized) {
          const users = await ApiService.getUsers();
          if (isMounted && Array.isArray(users)) {
            setAllUsers(users);
            // Verify if stored user and token are still valid in database
            const savedUserStr = localStorage.getItem(USER_KEY);
            const savedToken = localStorage.getItem(TOKEN_KEY);
            if (savedUserStr && savedToken) {
              try {
                const savedUser: User = JSON.parse(savedUserStr);
                const matching = users.find(u => u.id === savedUser.id && u.status === 'ACTIVE');
                if (matching) {
                  setCurrentUserState(matching);
                } else {
                  // User deleted, inactive, or invalidated -> require login with valid credentials
                  setCurrentUserState(null);
                  setAuthToken(null);
                  localStorage.removeItem(USER_KEY);
                  localStorage.removeItem(TOKEN_KEY);
                }
              } catch {
                setCurrentUserState(null);
                setAuthToken(null);
                localStorage.removeItem(USER_KEY);
                localStorage.removeItem(TOKEN_KEY);
              }
            } else {
              // No authenticated session -> require login with credentials
              setCurrentUserState(null);
              setAuthToken(null);
              localStorage.removeItem(USER_KEY);
              localStorage.removeItem(TOKEN_KEY);
            }
          }
        } else {
          // Uninitialized system
          setCurrentUserState(null);
          setAuthToken(null);
          localStorage.removeItem(USER_KEY);
          localStorage.removeItem(TOKEN_KEY);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [refreshSystemStatus]);

  const setCurrentUser = (user: User) => {
    setCurrentUserState(user);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  };

  const login = async (identifier: string, password: string) => {
    const res = await ApiService.login(identifier, password);
    if (res && res.success && res.user) {
      setCurrentUserState(res.user);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      if (res.token) {
        setAuthToken(res.token);
        localStorage.setItem(TOKEN_KEY, res.token);
      }
      await refreshUsers();
      await refreshSystemStatus();
    } else {
      throw new Error('Authentication failed. Please verify credentials.');
    }
  };

  const logout = () => {
    ApiService.logout();
    setCurrentUserState(null);
    setAuthToken(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  };

  const completeSetup = async (payload: SetupPayload) => {
    const res = await ApiService.setupSystem(payload);
    if (res && res.success && res.user) {
      setCurrentUserState(res.user);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      if (res.token) {
        setAuthToken(res.token);
        localStorage.setItem(TOKEN_KEY, res.token);
      }
      await refreshUsers();
      await refreshSystemStatus();
    } else {
      throw new Error('System setup failed to complete.');
    }
  };

  const switchUserById = (_userId: string) => {
    // Users must authenticate only with their own credentials
    logout();
  };

  const switchRole = (_role: UserRole) => {
    // Users must authenticate only with their own credentials
    logout();
  };

  const resetSystem = async () => {
    await ApiService.resetSystem();
    logout();
    setAllUsers([]);
    await refreshSystemStatus();
  };

  const isInitialized = Boolean(systemStatus?.isInitialized);
  const isAuthenticated = Boolean(currentUser);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        allUsers,
        systemStatus,
        isInitialized,
        isAuthenticated,
        isLoading,
        authToken,
        setCurrentUser,
        login,
        logout,
        completeSetup,
        refreshSystemStatus,
        refreshUsers,
        switchUserById,
        switchRole,
        resetSystem,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
