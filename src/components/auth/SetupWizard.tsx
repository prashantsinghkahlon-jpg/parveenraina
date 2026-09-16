import React, { useState } from 'react';
import { 
  Building2, 
  UserCheck, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Lock, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Coins, 
  Globe2, 
  Eye, 
  EyeOff, 
  Layers,
  AlertCircle
} from 'lucide-react';
import { SetupPayload } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';

interface SetupWizardProps {
  onSetupSuccess?: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onSetupSuccess }) => {
  const { completeSetup } = useAuth();
  const { refreshCompany } = useOrganization();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1: Organization & Identity
  const [companyName, setCompanyName] = useState('Apex Field Operations Inc.');
  const [companyCode, setCompanyCode] = useState('APEX');
  const [companyEmail, setCompanyEmail] = useState('operations@apexfieldtrack.com');
  const [companyPhone, setCompanyPhone] = useState('+1 (555) 234-5678');
  const [companyAddress, setCompanyAddress] = useState('100 Bush Street, Suite 1400');
  const [city, setCity] = useState('San Francisco');
  const [state, setState] = useState('CA');
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [timezone, setTimezone] = useState('America/Los_Angeles');

  // Step 2: Super Admin
  const [adminName, setAdminName] = useState('System Administrator');
  const [adminEmail, setAdminEmail] = useState('admin@apexfieldtrack.com');
  const [adminEmployeeId, setAdminEmployeeId] = useState('ADM-001');
  const [adminMobile, setAdminMobile] = useState('+1 (555) 987-6543');
  const [password, setPassword] = useState('Admin@2026!');
  const [confirmPassword, setConfirmPassword] = useState('Admin@2026!');
  const [showPassword, setShowPassword] = useState(false);

  // Step 3: Operational Defaults
  const [shiftName, setShiftName] = useState('General Day Shift');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [geofenceRadius, setGeofenceRadius] = useState(350);
  const [createSampleStaff, setCreateSampleStaff] = useState(true);

  // Currencies list
  const currencyOptions = [
    { symbol: '$', code: 'USD', name: 'US Dollar ($ - USD)' },
    { symbol: '₹', code: 'INR', name: 'Indian Rupee (₹ - INR)' },
    { symbol: '€', code: 'EUR', name: 'Euro (€ - EUR)' },
    { symbol: '£', code: 'GBP', name: 'British Pound (£ - GBP)' },
    { symbol: 'AED', code: 'AED', name: 'UAE Dirham (AED)' },
    { symbol: 'SAR', code: 'SAR', name: 'Saudi Riyal (SAR)' },
    { symbol: 'C$', code: 'CAD', name: 'Canadian Dollar (C$ - CAD)' },
    { symbol: 'A$', code: 'AUD', name: 'Australian Dollar (A$ - AUD)' },
    { symbol: 'S$', code: 'SGD', name: 'Singapore Dollar (S$ - SGD)' },
    { symbol: '¥', code: 'JPY', name: 'Japanese Yen (¥ - JPY)' },
    { symbol: 'CHF', code: 'CHF', name: 'Swiss Franc (CHF)' },
    { symbol: 'R$', code: 'BRL', name: 'Brazilian Real (R$ - BRL)' },
    { symbol: 'Rs', code: 'PKR', name: 'Pakistani Rupee (Rs - PKR)' },
    { symbol: '৳', code: 'BDT', name: 'Bangladeshi Taka (৳ - BDT)' },
    { symbol: '₦', code: 'NGN', name: 'Nigerian Naira (₦ - NGN)' },
    { symbol: 'R', code: 'ZAR', name: 'South African Rand (R - ZAR)' },
    { symbol: 'RM', code: 'MYR', name: 'Malaysian Ringgit (RM - MYR)' },
    { symbol: '₱', code: 'PHP', name: 'Philippine Peso (₱ - PHP)' },
    { symbol: 'CUSTOM', code: 'CUSTOM', name: 'Custom / Other Currency...' },
  ];

  const handleCurrencyChange = (code: string) => {
    const selected = currencyOptions.find(c => c.code === code);
    if (selected) {
      if (selected.code !== 'CUSTOM') {
        setCurrencyCode(selected.code);
        setCurrencySymbol(selected.symbol);
      }
    }
  };

  const validateStep1 = (): boolean => {
    if (!companyName.trim()) {
      setErrorMessage('Please enter the organization / company name.');
      return false;
    }
    if (!companyCode.trim()) {
      setErrorMessage('Please enter an organization code (e.g. APEX).');
      return false;
    }
    if (!companyEmail.trim() || !companyEmail.includes('@')) {
      setErrorMessage('Please enter a valid corporate email address.');
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!adminName.trim()) {
      setErrorMessage('Please provide the Administrator full name.');
      return false;
    }
    if (!adminEmail.trim() || !adminEmail.includes('@')) {
      setErrorMessage('Please provide a valid administrator email address.');
      return false;
    }
    if (!adminEmployeeId.trim()) {
      setErrorMessage('Please specify an Employee ID for the administrator.');
      return false;
    }
    if (password.length < 6) {
      setErrorMessage('Administrator password must be at least 6 characters long.');
      return false;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setErrorMessage(null);
    setStep((prev) => (prev + 1) as any);
  };

  const handleBack = () => {
    setErrorMessage(null);
    setStep((prev) => (prev - 1) as any);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1() || !validateStep2()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload: SetupPayload = {
      admin: {
        name: adminName.trim(),
        email: adminEmail.trim(),
        employeeId: adminEmployeeId.trim(),
        password: password,
        mobile: adminMobile.trim(),
      },
      company: {
        name: companyName.trim(),
        code: companyCode.trim().toUpperCase(),
        address: companyAddress.trim(),
        city: city.trim(),
        state: state.trim(),
        phone: companyPhone.trim(),
        email: companyEmail.trim(),
        currencySymbol: currencySymbol,
        currencyCode: currencyCode,
        timezone: timezone,
        latitude: 37.7749,
        longitude: -122.4194,
      },
      defaults: {
        shiftName: shiftName.trim(),
        startTime: startTime,
        endTime: endTime,
        geofenceRadiusMeters: Number(geofenceRadius) || 350,
        createSampleStaff: createSampleStaff,
      },
    };

    try {
      await completeSetup(payload);
      await refreshCompany();
      if (onSetupSuccess) {
        onSetupSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete initial deployment setup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 antialiased selection:bg-blue-500 selection:text-white">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/25 via-slate-900/80 to-slate-950 z-0" />

      <div className="relative z-10 w-full max-w-2xl bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header Ribbon */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold text-blue-100 mb-3 tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-blue-200" />
              <span>Deployment Initializer &bull; First Time Setup</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              FieldTrack Pro Deployment Wizard
            </h1>
            <p className="text-sm text-blue-100/90 mt-1 max-w-xl">
              Configure your enterprise identity, provision your super administrator account, and establish operational defaults for live tracking.
            </p>
          </div>

          {/* Stepper Dots */}
          <div className="grid grid-cols-4 gap-2 mt-6 pt-4 border-t border-white/15">
            {[
              { num: 1, label: 'Organization' },
              { num: 2, label: 'Super Admin' },
              { num: 3, label: 'Operations' },
              { num: 4, label: 'Confirm' }
            ].map((s) => (
              <div key={s.num} className="flex flex-col gap-1">
                <div className={`h-1.5 rounded-full transition-all duration-300 ${
                  step >= s.num ? 'bg-white' : 'bg-white/25'
                }`} />
                <span className={`text-[11px] font-medium transition-colors ${
                  step === s.num ? 'text-white font-bold' : 'text-white/60'
                }`}>
                  {s.num}. {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mx-6 sm:mx-8 mt-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-200">Validation Notice</p>
              <p className="mt-0.5 text-rose-300/90">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Step Forms */}
        <div className="p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm tracking-wide uppercase">
                <Building2 className="w-4 h-4" />
                <span>Step 1: Organization Profile &amp; Identity</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Organization / Company Name *
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Apex Logistics Solutions"
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Company Code *
                  </label>
                  <input
                    type="text"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                    placeholder="e.g. APEX"
                    maxLength={8}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono uppercase font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Corporate Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      placeholder="operations@company.com"
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Headquarters Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Headquarters Street Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="100 Enterprise Way, Suite 500"
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>Operating Currency (Universal)</span>
                  </label>
                  <select
                    value={
                      currencyOptions.some(c => c.code === currencyCode) ? currencyCode : 'CUSTOM'
                    }
                    onChange={(e) => handleCurrencyChange(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  >
                    {currencyOptions.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.name}
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <span className="block text-[10px] text-slate-400 font-semibold mb-1">Symbol</span>
                      <input
                        type="text"
                        value={currencySymbol}
                        onChange={(e) => setCurrencySymbol(e.target.value)}
                        placeholder="e.g. ₹ or $"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 font-semibold mb-1">ISO Code</span>
                      <input
                        type="text"
                        value={currencyCode}
                        onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                        placeholder="e.g. INR or USD"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="mt-2 px-2.5 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Payslip Preview:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {currencySymbol} 3,500.00 {currencyCode}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Globe2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>System Timezone</span>
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  >
                    <option value="America/New_York">Eastern Time (US &amp; Canada) - UTC-5</option>
                    <option value="America/Chicago">Central Time (US &amp; Canada) - UTC-6</option>
                    <option value="America/Denver">Mountain Time (US &amp; Canada) - UTC-7</option>
                    <option value="America/Los_Angeles">Pacific Time (US &amp; Canada) - UTC-8</option>
                    <option value="Asia/Kolkata">India Standard Time (IST) - UTC+5:30</option>
                    <option value="Asia/Dubai">Gulf Standard Time (GST) - UTC+4</option>
                    <option value="Europe/London">London (GMT / BST) - UTC+0</option>
                    <option value="Europe/Berlin">Central European Time - UTC+1</option>
                    <option value="Asia/Singapore">Singapore / Hong Kong - UTC+8</option>
                    <option value="UTC">Universal Coordinated Time (UTC)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm tracking-wide uppercase">
                <ShieldCheck className="w-4 h-4" />
                <span>Step 2: Super Administrator Provisioning</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Admin Employee ID *
                  </label>
                  <input
                    type="text"
                    value={adminEmployeeId}
                    onChange={(e) => setAdminEmployeeId(e.target.value)}
                    placeholder="ADM-001"
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono font-bold uppercase placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Admin Sign-In Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@company.com"
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Contact Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      value={adminMobile}
                      onChange={(e) => setAdminMobile(e.target.value)}
                      placeholder="+1 (555) 987-6543"
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Admin Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create secure password"
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-blue-950/40 border border-blue-800/40 rounded-xl text-xs text-blue-300 flex items-start gap-2.5">
                <UserCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p>
                  This account is granted <strong>Super Administrator</strong> privileges with full access to Master Setup, Live Map, Shift Scheduling, Visit Audits, and Staff Payroll.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm tracking-wide uppercase">
                <Layers className="w-4 h-4" />
                <span>Step 3: Operational Defaults</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Default Shift Title
                  </label>
                  <input
                    type="text"
                    value={shiftName}
                    onChange={(e) => setShiftName(e.target.value)}
                    placeholder="General Day Shift"
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Start Time
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    End Time
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  HQ Geofence Radius (Meters)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={100}
                    max={1000}
                    step={50}
                    value={geofenceRadius}
                    onChange={(e) => setGeofenceRadius(Number(e.target.value))}
                    className="flex-1 accent-blue-500 cursor-pointer"
                  />
                  <span className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono font-bold text-blue-400 min-w-[70px] text-center">
                    {geofenceRadius}m
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Field staff entering or exiting this radius will trigger automatic geofence compliance verification.
                </p>
              </div>

              <div className="p-4 bg-slate-900/60 border border-slate-700/80 rounded-xl">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={createSampleStaff}
                    onChange={(e) => setCreateSampleStaff(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 accent-blue-500"
                  />
                  <div>
                    <span className="text-sm font-bold text-slate-200 block">
                      Include 1 Sample Field Executive Account for route testing
                    </span>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      Creates a test field runner (FE-101 / field.staff@{companyEmail.split('@')[1] || 'company.com'}, password: Staff@123) for immediate mobile GPS testing. If unchecked, the deployment starts completely fresh with zero staff members.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm tracking-wide uppercase">
                <CheckCircle2 className="w-4 h-4" />
                <span>Step 4: Verify Deployment Specification</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Org Card */}
                <div className="p-4 bg-slate-900/80 border border-slate-700/80 rounded-xl">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Organization</span>
                  </p>
                  <p className="text-base font-bold text-white">{companyName}</p>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">Code: {companyCode}</p>
                  <div className="mt-3 pt-3 border-t border-slate-800 text-xs space-y-1 text-slate-300">
                    <p><span className="text-slate-500">HQ:</span> {companyAddress}, {city} {state}</p>
                    <p><span className="text-slate-500">Email:</span> {companyEmail}</p>
                    <p><span className="text-slate-500">Currency:</span> <strong className="text-amber-400">{currencySymbol} ({currencyCode})</strong></p>
                  </div>
                </div>

                {/* Admin Card */}
                <div className="p-4 bg-slate-900/80 border border-slate-700/80 rounded-xl">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Super Administrator</span>
                  </p>
                  <p className="text-base font-bold text-white">{adminName}</p>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">ID: {adminEmployeeId}</p>
                  <div className="mt-3 pt-3 border-t border-slate-800 text-xs space-y-1 text-slate-300">
                    <p><span className="text-slate-500">Login:</span> {adminEmail}</p>
                    <p><span className="text-slate-500">Mobile:</span> {adminMobile || 'Not provided'}</p>
                    <p><span className="text-slate-500">Role:</span> Super Administrator</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-950/30 border border-blue-800/40 rounded-xl text-xs text-blue-200">
                <p className="font-semibold text-blue-300 mb-1">What happens when you click "Initialize Deployment"?</p>
                <ul className="list-disc list-inside space-y-1 text-blue-200/90">
                  <li>Zero hardcoded mock demo data remains in memory.</li>
                  <li>Initializes persistence layer in <code>./data/database.json</code>.</li>
                  <li>Configures master company, HQ branch, departments, designations, shifts, and permissions.</li>
                  <li>Immediately authenticates you as Super Administrator to access the command center.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-slate-700/80">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-700/60 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-600/30 ml-auto"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center gap-2.5 transition-all shadow-lg shadow-emerald-600/30 ml-auto"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deploying System...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Initialize Deployment</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-slate-500 relative z-10">
        FieldTrack Pro &bull; Production Ready Release 1.2.0 &bull; Secure Storage Engine
      </div>
    </div>
  );
};
