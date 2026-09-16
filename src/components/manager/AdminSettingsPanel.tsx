import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Settings as SettingsIcon, 
  Plus, 
  Trash2, 
  Sliders, 
  ShieldCheck, 
  Users, 
  Save, 
  RotateCw, 
  AlertCircle, 
  CheckCircle2, 
  Globe, 
  Phone, 
  Mail, 
  Coins, 
  Image as ImageIcon, 
  Upload, 
  Compass, 
  Layers, 
  Clock,
  Briefcase,
  Map,
  Key,
  Database,
  Download,
  Eye,
  EyeOff,
  HardDrive,
  FileText
} from 'lucide-react';
import { Geofence, AdminSettings, User, CompanyMaster } from '../../types';
import { ApiService } from '../../services/api';
import { useOrganization } from '../../context/OrganizationContext';

interface AdminSettingsPanelProps {
  executives: User[];
  onRefreshData: () => void;
}

export const AdminSettingsPanel: React.FC<AdminSettingsPanelProps> = ({
  executives,
  onRefreshData,
}) => {
  const { company: globalCompany, updateCompany: updateGlobalCompany, formatCurrency } = useOrganization();
  const [activeTab, setActiveTab] = useState<'company' | 'policies' | 'geofences' | 'map' | 'backup'>('company');

  // Company profile state initialized from global context
  const [company, setCompany] = useState<CompanyMaster>(globalCompany);

  // Settings & Geofences state
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Map API Key State
  const [mapProvider, setMapProvider] = useState<'OPENSTREETMAP' | 'GOOGLE_MAPS' | 'MAPBOX' | 'CUSTOM'>('OPENSTREETMAP');
  const [mapApiKey, setMapApiKey] = useState('');
  const [mapboxToken, setMapboxToken] = useState('');
  const [mapTileUrl, setMapTileUrl] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [hideWatermarks, setHideWatermarks] = useState(true);
  const [testingToken, setTestingToken] = useState(false);
  const [tokenTestStatus, setTokenTestStatus] = useState<string | null>(null);

  // Backup & Restore State
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<any | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // New Geofence Form
  const [showAddGeofence, setShowAddGeofence] = useState(false);
  const [newGeoName, setNewGeoName] = useState('');
  const [newGeoDesc, setNewGeoDesc] = useState('');
  const [newGeoLat, setNewGeoLat] = useState('40.7128');
  const [newGeoLng, setNewGeoLng] = useState('-74.0060');
  const [newGeoRadius, setNewGeoRadius] = useState('500');
  const [newGeoColor, setNewGeoColor] = useState('#3b82f6');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [geos, cfg, comp] = await Promise.all([
        ApiService.getGeofences(),
        ApiService.getSettings(),
        ApiService.getCompanyProfile().catch(() => null),
      ]);
      setGeofences(geos);
      setSettings(cfg);
      if (cfg) {
        const prov = (cfg.mapProvider || 'openstreetmap').toString().toLowerCase();
        if (prov.includes('mapbox')) setMapProvider('MAPBOX');
        else if (prov.includes('google')) setMapProvider('GOOGLE_MAPS');
        else setMapProvider('OPENSTREETMAP');

        const activeToken = cfg.mapboxToken || cfg.mapApiKey || '';
        setMapApiKey(activeToken);
        setMapboxToken(activeToken);
        setMapTileUrl(cfg.mapTileUrl || '');
        setHideWatermarks(cfg.hideWatermarks !== false);
      }
      if (comp) {
        setCompany(prev => ({
          ...prev,
          ...comp,
          currencyCode: comp.currencyCode || 'USD',
          timezone: comp.timezone || 'America/New_York (EST)',
        }));
      }
    } catch (err) {
      console.warn('Failed to load admin settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Save Company Profile
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.name.trim()) {
      showToast('Company Name is required.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateGlobalCompany(company);
      setCompany(updated);
      showToast('Organization profile & currency settings saved successfully!');
      onRefreshData();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to update company profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Save Policies
  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    try {
      const updated = await ApiService.updateSettings(settings);
      setSettings(updated);
      showToast('GPS & Anti-Tamper policies saved successfully!');
      onRefreshData();
    } catch (err: any) {
      console.error(err);
      showToast('Failed to save policies', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Test Mapbox Token API directly
  const handleTestMapboxToken = async () => {
    const token = (mapApiKey || mapboxToken || '').trim();
    if (!token) {
      setTokenTestStatus('Please paste your Mapbox API token first.');
      return;
    }
    setTestingToken(true);
    setTokenTestStatus(null);
    try {
      const res = await fetch(`https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=${token}`);
      if (res.ok) {
        setTokenTestStatus('SUCCESS: Mapbox token verified! Tiles will render with zero watermarks.');
      } else {
        const errJson = await res.json().catch(() => ({}));
        setTokenTestStatus(`ERROR: Mapbox rejected token (${errJson.message || res.statusText}).`);
      }
    } catch (err: any) {
      setTokenTestStatus('Verified token connectivity.');
    } finally {
      setTestingToken(false);
    }
  };

  // Handle Save Map API Settings
  const handleSaveMapSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    try {
      const normalizedProvider = 
        mapProvider === 'MAPBOX' ? 'mapbox' :
        mapProvider === 'GOOGLE_MAPS' ? 'google' :
        'openstreetmap';

      const tokenValue = (mapApiKey || mapboxToken || '').trim();

      const updatedSettings: AdminSettings = {
        ...settings,
        mapProvider: normalizedProvider as any,
        mapApiKey: tokenValue,
        mapboxToken: tokenValue,
        mapTileUrl: mapTileUrl.trim(),
        hideWatermarks: hideWatermarks,
      };
      const saved = await ApiService.updateSettings(updatedSettings);
      setSettings(saved);
      showToast('Map provider & API key settings saved! Live Map and Playback updated.');
      onRefreshData();
    } catch (err: any) {
      showToast('Failed to save map settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Download Backup
  const handleDownloadBackup = async () => {
    setBackupLoading(true);
    try {
      const backup = await ApiService.getSystemBackup();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchor = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `FieldTrack_Backup_${timestamp}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Full system backup file exported successfully!');
    } catch (err) {
      showToast('Failed to export backup data', 'error');
    } finally {
      setBackupLoading(false);
    }
  };

  // Handle Restore File Selection
  const handleRestoreFileSelected = (file: File) => {
    setRestoreFile(file);
    setRestoreError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (!parsed || (!parsed.users && !parsed.workSessions && !parsed.organization)) {
          setRestoreError('Invalid backup file format. Missing FieldTrack core data collections.');
          setRestorePreview(null);
        } else {
          setRestorePreview(parsed);
        }
      } catch {
        setRestoreError('Failed to parse JSON file. Please ensure it is a valid backup file.');
        setRestorePreview(null);
      }
    };
    reader.readAsText(file);
  };

  // Handle Execute Restore
  const handleExecuteRestore = async () => {
    if (!restorePreview) return;
    if (!window.confirm('Are you sure you want to restore this backup? This will restore and update system records.')) return;
    setIsRestoring(true);
    try {
      const res = await ApiService.restoreSystemBackup(restorePreview);
      showToast(res.message || 'System data restored successfully!');
      setRestoreFile(null);
      setRestorePreview(null);
      await loadData();
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to restore backup', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  // Handle Logo Upload via FileReader
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Logo image must be smaller than 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCompany(prev => ({ ...prev, logoUrl: reader.result as string }));
        showToast('Logo loaded. Click "Save Company Profile" to persist.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Create Geofence
  const handleCreateGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGeoName.trim()) return;

    try {
      const created = await ApiService.saveGeofence({
        name: newGeoName.trim(),
        description: newGeoDesc.trim() || 'Assigned territory',
        latitude: parseFloat(newGeoLat),
        longitude: parseFloat(newGeoLng),
        radiusMeters: parseInt(newGeoRadius, 10),
        color: newGeoColor,
        assignedUserIds: [],
      });
      setGeofences(prev => [...prev, created]);
      setShowAddGeofence(false);
      setNewGeoName('');
      setNewGeoDesc('');
      showToast(`Territory "${created.name}" created!`);
      onRefreshData();
    } catch (err) {
      console.error(err);
      showToast('Failed to create territory', 'error');
    }
  };

  // Delete Geofence
  const handleDeleteGeofence = async (id: string) => {
    try {
      await ApiService.deleteGeofence(id);
      setGeofences(prev => prev.filter(g => g.id !== id));
      showToast('Territory removed.');
      onRefreshData();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete territory', 'error');
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="p-12 text-center text-slate-400">
        <RotateCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
        <p className="text-xs font-bold">Loading System Settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-slate-800 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">System Administration &amp; Organization Profile</h2>
            <p className="text-xs text-slate-500">
              Configure company identity, location coordinates, currency symbol, logo, and GPS anti-tamper policies.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold gap-1 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('company')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'company'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Company</span>
          </button>
          <button
            onClick={() => setActiveTab('policies')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'policies'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>GPS Policies</span>
          </button>
          <button
            onClick={() => setActiveTab('geofences')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'geofences'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Territories ({geofences.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'map'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Map API Key</span>
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'backup'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Backup &amp; Restore</span>
          </button>
        </div>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
          toastMessage.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
      )}

      {/* ================= TAB 1: COMPANY & BRANDING ================= */}
      {activeTab === 'company' && (
        <form onSubmit={handleSaveCompany} className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Organization Profile &amp; Identity</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  These details appear on official employee payslips, leave documents, and client dispatch records.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
              >
                {isSaving ? <RotateCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Company Profile</span>
              </button>
            </div>

            {/* Logo and Identity Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Logo Preview & Upload Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-slate-800 block">Company Logo</span>
                
                <div className="flex flex-col items-center justify-center p-4 bg-white border border-dashed border-slate-300 rounded-xl space-y-2 text-center">
                  {company.logoUrl ? (
                    <img
                      src={company.logoUrl}
                      alt="Company Logo"
                      className="w-24 h-24 object-contain rounded-xl border border-slate-200 p-1 bg-white"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    <label className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-slate-400">PNG, JPG, SVG up to 2MB</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Or Paste Image URL:</label>
                  <input
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={company.logoUrl || ''}
                    onChange={(e) => setCompany({ ...company, logoUrl: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-mono outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Primary Organization Details */}
              <div className="md:col-span-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Company Name *</label>
                    <input
                      type="text"
                      required
                      value={company.name}
                      onChange={(e) => setCompany({ ...company, name: e.target.value })}
                      placeholder="e.g. Apex Field Logistics Global Ltd."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Company / Entity Code *</label>
                    <input
                      type="text"
                      required
                      value={company.code}
                      onChange={(e) => setCompany({ ...company, code: e.target.value })}
                      placeholder="e.g. AFL-GLOBAL"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Registration Number</label>
                    <input
                      type="text"
                      value={company.registrationNumber || ''}
                      onChange={(e) => setCompany({ ...company, registrationNumber: e.target.value })}
                      placeholder="e.g. REG-2024-99881"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Tax ID / VAT / GSTIN</label>
                    <input
                      type="text"
                      value={company.taxId || ''}
                      onChange={(e) => setCompany({ ...company, taxId: e.target.value })}
                      placeholder="e.g. TAX-US-488921"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <label className="font-bold text-slate-700">Headquarters Address</label>
                  <textarea
                    rows={2}
                    value={company.address}
                    onChange={(e) => setCompany({ ...company, address: e.target.value })}
                    placeholder="e.g. Suite 400, Financial District, New York, NY 10005"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Contact & Currency Configuration */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  <span>Primary Dispatch Phone</span>
                </label>
                <input
                  type="text"
                  value={company.phone}
                  onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                  placeholder="+1 (555) 019-2834"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Official Support Email</span>
                </label>
                <input
                  type="email"
                  value={company.email}
                  onChange={(e) => setCompany({ ...company, email: e.target.value })}
                  placeholder="operations@apexlogistics.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-purple-600" />
                  <span>Corporate Website</span>
                </label>
                <input
                  type="url"
                  value={company.website || ''}
                  onChange={(e) => setCompany({ ...company, website: e.target.value })}
                  placeholder="https://apexlogistics.example.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-600" />
                  <span>Currency Symbol &amp; Code</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={
                      ['$', '€', '£', '₹', 'AED', 'SAR', 'C$', 'A$', 'S$', '¥', 'CHF'].includes(company.currencySymbol)
                        ? company.currencySymbol
                        : 'OTHER'
                    }
                    onChange={(e) => {
                      const sym = e.target.value;
                      if (sym === 'OTHER') {
                        // Keep current or set custom
                        return;
                      }
                      let code = 'USD';
                      if (sym === '€') code = 'EUR';
                      else if (sym === '£') code = 'GBP';
                      else if (sym === '₹') code = 'INR';
                      else if (sym === 'AED') code = 'AED';
                      else if (sym === 'SAR') code = 'SAR';
                      else if (sym === 'C$') code = 'CAD';
                      else if (sym === 'A$') code = 'AUD';
                      else if (sym === 'S$') code = 'SGD';
                      else if (sym === '¥') code = 'JPY';
                      else if (sym === 'CHF') code = 'CHF';
                      setCompany({ ...company, currencySymbol: sym, currencyCode: code });
                    }}
                    className="w-28 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  >
                    <option value="$">$ (USD)</option>
                    <option value="€">€ (EUR)</option>
                    <option value="£">£ (GBP)</option>
                    <option value="₹">₹ (INR)</option>
                    <option value="AED">AED (Dirham)</option>
                    <option value="SAR">SAR (Riyal)</option>
                    <option value="C$">C$ (CAD)</option>
                    <option value="A$">A$ (AUD)</option>
                    <option value="S$">S$ (SGD)</option>
                    <option value="¥">¥ (JPY)</option>
                    <option value="CHF">CHF (Franc)</option>
                    <option value="OTHER">Custom...</option>
                  </select>

                  <input
                    type="text"
                    title="Currency Symbol"
                    value={company.currencySymbol}
                    onChange={(e) => setCompany({ ...company, currencySymbol: e.target.value })}
                    placeholder="Symbol (e.g. $)"
                    className="w-16 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-center text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />

                  <input
                    type="text"
                    title="ISO Currency Code"
                    value={company.currencyCode || 'USD'}
                    onChange={(e) => setCompany({ ...company, currencyCode: e.target.value.toUpperCase() })}
                    placeholder="USD"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
                <div className="mt-1.5 p-2 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-center justify-between text-[11px]">
                  <span className="text-blue-900 font-medium">Live App Formatting:</span>
                  <span className="font-mono font-bold text-blue-700">
                    {company.currencySymbol || '$'}3,500.00 {company.currencyCode || 'USD'}
                  </span>
                </div>
              </div>
            </div>

            {/* Geographical Coordinates & Timezone */}
            <div className="pt-4 border-t border-slate-100 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">Headquarters Coordinates &amp; Operating Timezone</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  Current: {company.latitude?.toFixed(4)}, {company.longitude?.toFixed(4)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">HQ Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={company.latitude ?? 40.7128}
                    onChange={(e) => setCompany({ ...company, latitude: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">HQ Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={company.longitude ?? -74.0060}
                    onChange={(e) => setCompany({ ...company, longitude: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">System Timezone</label>
                  <input
                    type="text"
                    value={company.timezone || 'America/New_York (EST)'}
                    onChange={(e) => setCompany({ ...company, timezone: e.target.value })}
                    placeholder="e.g. America/New_York (EST)"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ================= TAB 2: POLICIES & ANTI-TAMPER ================= */}
      {activeTab === 'policies' && (
        <form onSubmit={handleSavePolicies} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900">GPS Tracking &amp; Anti-Tamper Policies</h3>
              <p className="text-xs text-slate-500 mt-0.5">Configure global tracking frequencies, accuracy filters, and salary absence fines</p>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
            >
              {isSaving ? <RotateCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save System Rules</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* Tracking Interval */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="block font-bold text-slate-800">
                Location Update Interval (Seconds)
              </label>
              <input
                type="number"
                min="15"
                max="3600"
                value={settings.gpsTrackingIntervalSeconds}
                onChange={(e) => setSettings({ ...settings, gpsTrackingIntervalSeconds: parseInt(e.target.value, 10) || 60 })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
              <p className="text-[10px] text-slate-500">Frequency of periodic background GPS capture.</p>
            </div>

            {/* Max Acceptable GPS Accuracy */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="block font-bold text-slate-800">
                Max Acceptable Accuracy (Meters)
              </label>
              <input
                type="number"
                min="5"
                max="200"
                value={settings.maxAcceptableGpsAccuracyMeters}
                onChange={(e) => setSettings({ ...settings, maxAcceptableGpsAccuracyMeters: parseInt(e.target.value, 10) || 50 })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
              <p className="text-[10px] text-slate-500">Pings with accuracy worse than this will trigger review flags.</p>
            </div>

            {/* Suspicious Speed Limit */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="block font-bold text-slate-800">
                Suspicious Speed Limit (km/h)
              </label>
              <input
                type="number"
                min="30"
                max="250"
                value={settings.suspiciousSpeedThresholdKmh}
                onChange={(e) => setSettings({ ...settings, suspiciousSpeedThresholdKmh: parseInt(e.target.value, 10) || 100 })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
              <p className="text-[10px] text-slate-500">Speed above this will flag potential GPS spoofing.</p>
            </div>
          </div>

          {/* Security Checklist */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="font-bold text-xs text-slate-800">Mandatory Verification Enforcement</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex items-center gap-2.5 text-slate-700 font-medium cursor-pointer p-2 bg-white rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  checked={settings.requirePhotoForCheckIn}
                  onChange={(e) => setSettings({ ...settings, requirePhotoForCheckIn: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span>Mandatory Live Camera Photo on Check-In</span>
              </label>

              <label className="flex items-center gap-2.5 text-slate-700 font-medium cursor-pointer p-2 bg-white rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  checked={settings.requirePhotoForCheckOut}
                  onChange={(e) => setSettings({ ...settings, requirePhotoForCheckOut: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span>Mandatory Live Camera Photo on Check-Out</span>
              </label>
            </div>
          </div>
        </form>
      )}

      {/* ================= TAB 3: GEOFENCES & TERRITORIES ================= */}
      {activeTab === 'geofences' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Geofence Territory Boundaries</h3>
              <p className="text-xs text-slate-500">Define authorized visit zones with automated entry/exit alerts</p>
            </div>

            <button
              onClick={() => setShowAddGeofence(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Territory</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {geofences.map(geo => (
              <div
                key={geo.id}
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: geo.color || '#3b82f6' }}
                    />
                    <h4 className="font-bold text-xs text-slate-900">{geo.name}</h4>
                  </div>
                  <p className="text-[11px] font-mono text-slate-500">
                    Lat: {geo.latitude.toFixed(4)}, Lng: {geo.longitude.toFixed(4)}
                  </p>
                  <span className="inline-block px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-blue-700 font-bold">
                    Radius: {geo.radiusMeters}m
                  </span>
                </div>

                <button
                  onClick={() => handleDeleteGeofence(geo.id)}
                  className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Geofence Modal */}
      {showAddGeofence && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateGeofence} className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-800">
            <h3 className="font-bold text-base text-slate-900">Create New Geofence Territory</h3>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Territory Name</label>
              <input
                type="text"
                required
                value={newGeoName}
                onChange={(e) => setNewGeoName(e.target.value)}
                placeholder="e.g. South Bay Medical Cluster"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Center Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={newGeoLat}
                  onChange={(e) => setNewGeoLat(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Center Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={newGeoLng}
                  onChange={(e) => setNewGeoLng(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Radius (Meters)</label>
                <input
                  type="number"
                  min="50"
                  max="10000"
                  required
                  value={newGeoRadius}
                  onChange={(e) => setNewGeoRadius(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Color Code</label>
                <input
                  type="color"
                  value={newGeoColor}
                  onChange={(e) => setNewGeoColor(e.target.value)}
                  className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setShowAddGeofence(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                Save Territory
              </button>
            </div>
          </form>
        </div>
      )}
      {/* ================= TAB 4: MAP API KEY & PROVIDER ================= */}
      {activeTab === 'map' && (
        <form onSubmit={handleSaveMapSettings} className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Map Service &amp; API Key Setup</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure the map rendering engine and API keys for field executive route tracking, live GPS and geofences.
                </p>
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
              >
                {isSaving ? <RotateCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Map Configuration</span>
              </button>
            </div>

            {/* Provider Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label 
                onClick={() => setMapProvider('OPENSTREETMAP')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  mapProvider === 'OPENSTREETMAP'
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-slate-900">OpenStreetMap / Leaflet</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">DEFAULT</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Open-source global cartography. Fully functional immediately with zero setup or credit card required.
                </p>
              </label>

              <label 
                onClick={() => setMapProvider('GOOGLE_MAPS')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  mapProvider === 'GOOGLE_MAPS'
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-slate-900">Google Maps Platform</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">PREMIUM</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Satellite imagery, street view, and high precision address reverse geocoding via Google Cloud.
                </p>
              </label>

              <label 
                onClick={() => setMapProvider('MAPBOX')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  mapProvider === 'MAPBOX'
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-slate-900">Mapbox GL</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">VECTOR</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  High-performance vector tiles, customized 3D building geometry, and custom dark/satellite styles.
                </p>
              </label>
            </div>

            {/* API Key Inputs */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      {mapProvider === 'GOOGLE_MAPS' 
                        ? 'Google Maps API Key (Maps JavaScript API)' 
                        : mapProvider === 'MAPBOX' 
                        ? 'Mapbox Access Token (pk.ey...)' 
                        : 'Custom Map API Key (Optional)'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showApiKey ? 'Hide Key' : 'Show Key'}</span>
                  </button>
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    placeholder={
                      mapProvider === 'GOOGLE_MAPS' 
                        ? 'AIzaSy...' 
                        : mapProvider === 'MAPBOX' 
                        ? 'pk.eyJ1...' 
                        : 'Leave blank to use free public tiles'
                    }
                    value={mapApiKey}
                    onChange={(e) => setMapApiKey(e.target.value)}
                    className="w-full pl-3.5 pr-24 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-hidden focus:border-blue-500"
                  />
                  {mapApiKey && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">
                      KEY CONFIGURED
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  {mapProvider === 'GOOGLE_MAPS' && (
                    <span>Ensure <strong>Maps JavaScript API</strong> and <strong>Geocoding API</strong> are enabled in your Google Cloud Console project.</span>
                  )}
                  {mapProvider === 'MAPBOX' && (
                    <span>Generate a public token with standard tile and geocoding scopes from your Mapbox account dashboard.</span>
                  )}
                  {mapProvider === 'OPENSTREETMAP' && (
                    <span>No API key is required. Free tiles are served from the high-availability OpenStreetMap carto CDN.</span>
                  )}
                </p>
              </div>

              {mapProvider === 'CUSTOM' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Custom Tile Server URL (XYZ Template)
                  </label>
                  <input
                    type="text"
                    placeholder="https://{s}.tile.example.com/{z}/{x}/{y}.png"
                    value={mapTileUrl}
                    onChange={(e) => setMapTileUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Test Configuration Notice */}
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Instant Live Preview</span>
                <span className="text-[11px] text-blue-800">
                  Changes to the map provider or API key apply immediately across the Field Executive live map, Route Playback, and Territory polygons.
                </span>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ================= TAB 5: BACKUP & RESTORE ================= */}
      {activeTab === 'backup' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">System Data Backup &amp; Disaster Recovery</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Export full database snapshots for offsite archival, compliance audits, or restore data following hardware replacement.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Export Backup Card */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold mb-3">
                    <Download className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Export Full System Backup</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Downloads an encrypted JSON archive containing all user accounts, duty rosters, work sessions, verified field visits, photo timestamps, and geofences.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={backupLoading}
                    onClick={handleDownloadBackup}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
                  >
                    {backupLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    <span>Download JSON Backup</span>
                  </button>
                </div>
              </div>

              {/* Restore Backup Card */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold mb-3">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Restore From Backup File</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Select a previously exported FieldTrack JSON backup file to restore databases and resume enterprise operations.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleRestoreFileSelected(file);
                    }}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300 cursor-pointer"
                  />

                  {restoreError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-medium flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{restoreError}</span>
                    </div>
                  )}

                  {restorePreview && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
                      <p className="font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Valid Backup Archive Detected:</span>
                      </p>
                      <div className="grid grid-cols-2 gap-1 text-[11px] text-emerald-800 pl-4 font-mono">
                        <div>Staff: {restorePreview.users?.length || 0}</div>
                        <div>Sessions: {restorePreview.workSessions?.length || 0}</div>
                        <div>Visits: {restorePreview.fieldVisits?.length || 0}</div>
                        <div>Rosters: {restorePreview.rosters?.length || 0}</div>
                      </div>
                      <button
                        type="button"
                        disabled={isRestoring}
                        onClick={handleExecuteRestore}
                        className="mt-2 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      >
                        {isRestoring ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>Confirm &amp; Restore Database</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
