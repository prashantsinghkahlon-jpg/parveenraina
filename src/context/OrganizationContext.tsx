import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { CompanyMaster } from '../types';
import { ApiService } from '../services/api';
import { useAuth } from './AuthContext';

export interface OrganizationContextType {
  company: CompanyMaster;
  currencySymbol: string;
  currencyCode: string;
  formatCurrency: (amount: number | undefined | null, options?: { showCode?: boolean; decimals?: number }) => string;
  updateCompany: (data: Partial<CompanyMaster>) => Promise<CompanyMaster>;
  refreshCompany: () => Promise<void>;
  isLoading: boolean;
}

const DEFAULT_COMPANY: CompanyMaster = {
  id: 'comp-1',
  name: 'Field Logistics Ltd.',
  code: 'OPS-CORP',
  registrationNumber: 'REG-2024-001',
  taxId: '',
  address: 'Operations Headquarters',
  phone: '',
  email: 'admin@fieldtrack.com',
  currencySymbol: '$',
  currencyCode: 'USD',
  logoUrl: '',
  website: '',
  latitude: 40.7128,
  longitude: -74.0060,
  timezone: 'America/New_York',
};

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { systemStatus, isAuthenticated } = useAuth();
  const [company, setCompany] = useState<CompanyMaster>(() => ({
    ...DEFAULT_COMPANY,
    currencySymbol: systemStatus?.currencySymbol || '$',
    currencyCode: systemStatus?.currencyCode || 'USD',
    name: systemStatus?.companyName || DEFAULT_COMPANY.name,
    code: systemStatus?.companyCode || DEFAULT_COMPANY.code,
  }));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshCompany = useCallback(async () => {
    try {
      const data = await ApiService.getCompanyProfile();
      if (data && (data.name || data.currencySymbol)) {
        setCompany(prev => ({
          ...prev,
          ...data,
          currencySymbol: data.currencySymbol || systemStatus?.currencySymbol || prev.currencySymbol || '$',
          currencyCode: data.currencyCode || systemStatus?.currencyCode || prev.currencyCode || 'USD',
        }));
      } else if (systemStatus?.currencySymbol) {
        setCompany(prev => ({
          ...prev,
          currencySymbol: systemStatus.currencySymbol || prev.currencySymbol || '$',
          currencyCode: systemStatus.currencyCode || prev.currencyCode || 'USD',
          name: systemStatus.companyName || prev.name,
          code: systemStatus.companyCode || prev.code,
        }));
      }
    } catch (err) {
      console.warn('Failed to load company profile from server:', err);
    } finally {
      setIsLoading(false);
    }
  }, [systemStatus]);

  // Sync state whenever system status changes (e.g. after setup wizard completes)
  useEffect(() => {
    if (systemStatus?.currencySymbol) {
      setCompany(prev => ({
        ...prev,
        currencySymbol: systemStatus.currencySymbol!,
        currencyCode: systemStatus.currencyCode || prev.currencyCode || 'USD',
        name: systemStatus.companyName || prev.name,
        code: systemStatus.companyCode || prev.code,
      }));
    }
    refreshCompany();
  }, [systemStatus, isAuthenticated, refreshCompany]);

  const updateCompany = async (data: Partial<CompanyMaster>): Promise<CompanyMaster> => {
    const updated = await ApiService.updateCompanyProfile(data);
    setCompany(prev => ({
      ...prev,
      ...updated,
      currencySymbol: updated.currencySymbol || data.currencySymbol || prev.currencySymbol || '$',
      currencyCode: updated.currencyCode || data.currencyCode || prev.currencyCode || 'USD',
    }));
    return updated;
  };

  const currencySymbol = company.currencySymbol || systemStatus?.currencySymbol || '$';
  const currencyCode = company.currencyCode || systemStatus?.currencyCode || 'USD';

  const formatCurrency = useCallback((
    amount: number | undefined | null,
    options?: { showCode?: boolean; decimals?: number }
  ): string => {
    const val = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    const decimals = options?.decimals !== undefined ? options.decimals : (val % 1 === 0 ? 0 : 2);
    const formattedNum = val.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    const isCodeSymbol = /^[A-Z]{3,4}$/.test(currencySymbol);
    const baseFormatted = isCodeSymbol 
      ? `${currencySymbol} ${formattedNum}` 
      : `${currencySymbol}${formattedNum}`;

    if (options?.showCode && currencyCode && !isCodeSymbol) {
      return `${baseFormatted} ${currencyCode}`;
    }
    return baseFormatted;
  }, [currencySymbol, currencyCode]);

  return (
    <OrganizationContext.Provider
      value={{
        company,
        currencySymbol,
        currencyCode,
        formatCurrency,
        updateCompany,
        refreshCompany,
        isLoading,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = (): OrganizationContextType => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};
